import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.impute import SimpleImputer
from imblearn.over_sampling import SMOTE
import joblib
import warnings
import os

warnings.filterwarnings('ignore')

def generate_personalized_insight(user_id: str) -> dict:
    """
    Fuses smartwatch data and wellness logs, handles class imbalance with SMOTE, 
    trains (or loads) a Random Forest model, generates graphs, and returns the top insight.
    """
    try:
        wellness_df = pd.read_csv(f'data/{user_id}/pmsys/wellness.csv')
        sleep_df = pd.read_csv(f'data/{user_id}/fitbit/sleep_score.csv')
        steps_df = pd.read_json(f'data/{user_id}/fitbit/steps.json')
    except FileNotFoundError:
        return {"error": f"Data for {user_id} not found."}

    # Data Fusion
    wellness_df['Date'] = pd.to_datetime(wellness_df['effective_time_frame']).dt.date
    sleep_df['Date'] = pd.to_datetime(sleep_df['timestamp']).dt.date
    steps_df['Date'] = pd.to_datetime(steps_df['dateTime']).dt.date

    steps_df['steps'] = steps_df['value'].astype(int)
    daily_steps_df = steps_df.groupby('Date')['steps'].sum().reset_index()

    merged_df = pd.merge(wellness_df, sleep_df, on='Date', how='inner')
    merged_df = pd.merge(merged_df, daily_steps_df, on='Date', how='inner')
    merged_df = merged_df.sort_values('Date').reset_index(drop=True)

    # Feature Engineering (Sleep Debt & Fatigue)
    merged_df['sleep_score_yesterday'] = merged_df['overall_score'].shift(1)
    merged_df['steps_yesterday'] = merged_df['steps'].shift(1)
    merged_df['sleep_3d_avg'] = merged_df['overall_score'].rolling(window=3).mean()
    merged_df = merged_df.bfill() 

    # Target Variable
    merged_df['mood_category'] = merged_df['mood'].apply(lambda x: 'Low/Neutral' if x <= 3 else 'High')

    features = [
        'steps', 'overall_score', 'deep_sleep_in_minutes', 'resting_heart_rate', 
        'restlessness', 'sleep_score_yesterday', 'steps_yesterday', 'sleep_3d_avg'
    ]
    
    X = merged_df[features]
    y = merged_df['mood_category'] 

    # 1. Check if the user has enough total days to run Machine Learning
    if len(X) < 5:
        return {
            "error": "Not enough data.", 
            "message": f"Participant {user_id} only has {len(X)} complete days logged. Keep wearing your watch and logging your journal!"
        }
        
    # 2. Check if the user ONLY logged good days or ONLY logged bad days
    if len(y.unique()) == 1:
        only_mood = y.iloc[0]
        return {
            "error": "No mood variance.", 
            "message": f"Participant {user_id} exclusively logged '{only_mood}' moods. The AI needs a mix of good and bad days to find out what triggers your changes."
        }

    # --- PRODUCTION SCALING: MODEL SERIALIZATION ---
    # Create the directory if it doesn't exist
    if not os.path.exists('saved_models'):
        os.makedirs('saved_models')
        
    model_path = f'saved_models/rf_model_{user_id}.joblib'
    
    if os.path.exists(model_path):
        # Load the existing model instantly!
        print(f"Loading existing model for {user_id}...")
        rf_model = joblib.load(model_path)
    else:
        # Train a new model if one doesn't exist
        print(f"Training new model for {user_id}...")
        
        # Train/Test Split
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
        imputer = SimpleImputer(strategy='mean')
        X_train_clean = imputer.fit_transform(X_train)
        
        # DYNAMIC SMOTE
        min_class_samples = y_train.value_counts().min()
        
        if min_class_samples > 1:
            k = min(5, min_class_samples - 1)
            smote = SMOTE(random_state=42, k_neighbors=k)
            X_train_balanced, y_train_balanced = smote.fit_resample(X_train_clean, y_train)
        else:
            X_train_balanced, y_train_balanced = X_train_clean, y_train
            
        # Tuned AI Model
        rf_model = RandomForestClassifier(n_estimators=200, max_depth=5, min_samples_split=5, random_state=42)
        rf_model.fit(X_train_balanced, y_train_balanced)
        
        # Save the model to the hard drive for future API calls
        joblib.dump(rf_model, model_path)
        print(f"Model saved to {model_path}")

    # Graph Generation
    if not os.path.exists('output_graphs'):
        os.makedirs('output_graphs')

    importances = rf_model.feature_importances_
    feature_importance_df = pd.DataFrame({'Physical Metric': features, 'Impact (%)': importances * 100})
    feature_importance_df = feature_importance_df.sort_values(by='Impact (%)', ascending=False)

    plt.figure(figsize=(10, 6))
    sns.barplot(x='Impact (%)', y='Physical Metric', data=feature_importance_df, palette='viridis')
    plt.title(f'Personalized Health Drivers for Participant {user_id}')
    plt.tight_layout()
    plt.savefig(f'output_graphs/feature_importance_{user_id}.png')
    plt.close()

    # Extract Top Insight
    top_feature = feature_importance_df.iloc[0]['Physical Metric'].replace('_', ' ')
    top_feature_impact_percent = float(round(feature_importance_df.iloc[0]['Impact (%)'], 2))
    insight_text = f"Based on your data, your {top_feature} is the #1 driver for your mood today!"

    latest_feature_values = {}
    latest_row = merged_df.iloc[-1]
    for feature_name in features:
        latest_feature_values[feature_name] = float(round(latest_row[feature_name], 2))

    feature_importances = [
        {
            "feature": row['Physical Metric'],
            "impact_percent": float(round(row['Impact (%)'], 2)),
        }
        for _, row in feature_importance_df.iterrows()
    ]

    return {
        "user_id": user_id,
        "top_feature": top_feature,
        "top_feature_impact_percent": top_feature_impact_percent,
        "insight_message": insight_text,
        "graphs_generated": True,
        "data_days_used": int(len(merged_df)),
        "latest_feature_values": latest_feature_values,
        "feature_importances": feature_importances,
    }