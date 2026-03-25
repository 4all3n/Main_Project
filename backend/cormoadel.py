import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report, confusion_matrix
from sklearn.impute import SimpleImputer
import warnings
warnings.filterwarnings('ignore')

def generate_advanced_insight(user_id):
    print(f"\nAnalyzing data for participant: {user_id}...")
    
    # ==========================================
    # STEP 1 & 2: DATA ACQUISITION & FUSION
    # ==========================================
    try:
        wellness_df = pd.read_csv(f'data/{user_id}/pmsys/wellness.csv')
        sleep_df = pd.read_csv(f'data/{user_id}/fitbit/sleep_score.csv')
        steps_df = pd.read_json(f'data/{user_id}/fitbit/steps.json')
    except FileNotFoundError:
        print(f"Error: Could not find data for {user_id}.")
        return

    wellness_df['Date'] = pd.to_datetime(wellness_df['effective_time_frame']).dt.date
    sleep_df['Date'] = pd.to_datetime(sleep_df['timestamp']).dt.date
    steps_df['Date'] = pd.to_datetime(steps_df['dateTime']).dt.date

    steps_df['steps'] = steps_df['value'].astype(int)
    daily_steps_df = steps_df.groupby('Date')['steps'].sum().reset_index()

    merged_df = pd.merge(wellness_df, sleep_df, on='Date', how='inner')
    merged_df = pd.merge(merged_df, daily_steps_df, on='Date', how='inner')
    
    # Sort strictly by date so our "yesterday" math works correctly
    merged_df = merged_df.sort_values('Date').reset_index(drop=True)

    # ==========================================
    # STEP 3: ADVANCED FEATURE ENGINEERING
    # ==========================================
    print("Engineering 'Sleep Debt' and 'Fatigue' features...")
    
    # 1. Lag Features (Looking at Yesterday)
    merged_df['sleep_score_yesterday'] = merged_df['overall_score'].shift(1)
    merged_df['steps_yesterday'] = merged_df['steps'].shift(1)
    
    # 2. Rolling Averages (Looking at the 3-Day Trend)
    merged_df['sleep_3d_avg'] = merged_df['overall_score'].rolling(window=3).mean()
    merged_df['steps_3d_avg'] = merged_df['steps'].rolling(window=3).mean()
    
    # Because 'shifting' data leaves the very first day blank (there is no yesterday for day 1),
    # we use backward fill (.bfill) to safely copy the day 2 data into day 1's empty slots.
    merged_df = merged_df.bfill()

    # Target Variable
    merged_df['mood_category'] = merged_df['mood'].apply(lambda x: 'Low/Neutral' if x <= 3 else 'High')

    # Our new, much smarter feature list
    features = [
        'steps', 'overall_score', 'deep_sleep_in_minutes', 'resting_heart_rate', 'restlessness',
        'sleep_score_yesterday', 'steps_yesterday', 'sleep_3d_avg', 'steps_3d_avg'
    ]
    
    X = merged_df[features]
    y = merged_df['mood_category'] 

    # ==========================================
    # STEP 4: PREPARATION & TUNED ML MODEL
    # ==========================================
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    imputer = SimpleImputer(strategy='mean')
    X_train_clean = imputer.fit_transform(X_train)
    X_test_clean = imputer.transform(X_test)

    # HYPERPARAMETER TUNING: We restrict the tree depth so it finds real patterns, not noise.
    rf_model = RandomForestClassifier(
        n_estimators=200,         # Added more trees for stability
        max_depth=5,              # Prevents the model from over-memorizing the data
        min_samples_split=5,      # Forces the AI to look for broader trends
        random_state=42, 
        class_weight='balanced'
    )
    rf_model.fit(X_train_clean, y_train)

    # ==========================================
    # STEP 5: EVALUATION & INSIGHTS
    # ==========================================
    y_pred = rf_model.predict(X_test_clean)
    
    print("\n" + "="*45)
    print(" MODEL EVALUATION METRICS")
    print("="*45)
    print(classification_report(y_test, y_pred))

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

# Run it
generate_advanced_insight('p15')