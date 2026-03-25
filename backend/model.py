import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix
from sklearn.impute import SimpleImputer
import warnings
warnings.filterwarnings('ignore')

def generate_personalized_insight(user_id):
    print(f"\nAnalyzing data for participant: {user_id}...")
    
    # ==========================================
    # STEP 1: DYNAMIC DATA ACQUISITION
    # ==========================================
    try:
        wellness_df = pd.read_csv(f'data/{user_id}/pmsys/wellness.csv')
        sleep_df = pd.read_csv(f'data/{user_id}/fitbit/sleep_score.csv')
        steps_df = pd.read_json(f'data/{user_id}/fitbit/steps.json')
    except FileNotFoundError as e:
        print(f"Error: Could not find data for {user_id}. {e}")
        return

    # ==========================================
    # STEP 2: DATA FUSION
    # ==========================================
    wellness_df['Date'] = pd.to_datetime(wellness_df['effective_time_frame']).dt.date
    sleep_df['Date'] = pd.to_datetime(sleep_df['timestamp']).dt.date
    steps_df['Date'] = pd.to_datetime(steps_df['dateTime']).dt.date

    steps_df['steps'] = steps_df['value'].astype(int)
    daily_steps_df = steps_df.groupby('Date')['steps'].sum().reset_index()

    merged_df = pd.merge(wellness_df, sleep_df, on='Date', how='inner')
    merged_df = pd.merge(merged_df, daily_steps_df, on='Date', how='inner')

    # Grouping mood into categories to help the model handle the 1-5 scale better
    # 1-3 = Low/Neutral Mood, 4-5 = High Mood
    merged_df['mood_category'] = merged_df['mood'].apply(lambda x: 'Low/Neutral' if x <= 3 else 'High')

    features = ['steps', 'overall_score', 'deep_sleep_in_minutes', 'resting_heart_rate', 'restlessness']
    X = merged_df[features]
    y = merged_df['mood_category'] 

    # ==========================================
    # STEP 3: PROFESSIONAL DATA PREPARATION
    # ==========================================
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    # FIX: Impute missing values AFTER the split to prevent Data Leakage
    imputer = SimpleImputer(strategy='mean')
    X_train_clean = imputer.fit_transform(X_train)
    X_test_clean = imputer.transform(X_test)

    # ==========================================
    # STEP 4: BALANCED AI PROCESSING ENGINE
    # ==========================================
    # FIX: class_weight='balanced' forces the model to penalize itself heavily if it ignores the minority classes (bad days)
    rf_model = RandomForestClassifier(n_estimators=100, random_state=42, class_weight='balanced')
    rf_model.fit(X_train_clean, y_train)

    # ==========================================
    # STEP 5: RIGOROUS EVALUATION
    # ==========================================
    y_pred = rf_model.predict(X_test_clean)

    print("\n" + "="*45)
    print(" MODEL EVALUATION METRICS (CLASSIFICATION REPORT)")
    print("="*45)
    # The classification report is what panelists actually want to see. It shows Precision and Recall.
    print(classification_report(y_test, y_pred))

    # ==========================================
    # STEP 6: INSIGHT GENERATION
    # ==========================================
    importances = rf_model.feature_importances_
    feature_importance_df = pd.DataFrame({'Physical Metric': features, 'Impact (%)': importances * 100})
    feature_importance_df = feature_importance_df.sort_values(by='Impact (%)', ascending=False)

    print("\n" + "="*45)
    print(" INSIGHT GENERATION (BACKEND ALGORITHM)")
    print("="*45)
    print(feature_importance_df.round(2).to_string(index=False))

    top_feature = feature_importance_df.iloc[0]['Physical Metric'].replace('_', ' ')

    print("\n" + "="*45)
    print(f" UI PRESENTATION LAYER FOR {user_id.upper()}")
    print("="*45)
    print(f"MindfulMomentum Insight: 'Based on your data, your {top_feature} is the #1 driver for your mood!'\n")

# Run the pipeline for p01. You can now change this to 'p02', 'p03', etc.!
generate_personalized_insight('p15')