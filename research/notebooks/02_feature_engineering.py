# %% [markdown]
# # Step 2: Feature Engineering
# Goal: Build the full 22+ feature dataset that the current production code ignores.

# %%
import os
import glob
import json
import pandas as pd
import numpy as np
from datetime import timedelta

base_dir = '/home/fallen/Projects/Main_Project/backend/Data'
users = [f'p{i:02d}' for i in range(1, 17)]

def load_json_to_df(filepath, value_col):
    if not os.path.exists(filepath):
        return pd.DataFrame(columns=['Date', value_col])
    with open(filepath, 'r') as f:
        data = json.load(f)
    if not data:
        return pd.DataFrame(columns=['Date', value_col])
    
    if isinstance(data, list) and 'dateTime' in data[0] and 'value' in data[0]:
        df = pd.DataFrame(data)
        df.rename(columns={'dateTime': 'Date', 'value': value_col}, inplace=True)
    else:
        df = pd.DataFrame(data)
        if 'value' in df.columns and isinstance(df['value'].iloc[0], dict):
            value_df = df['value'].apply(pd.Series)
            df = pd.concat([df.drop('value', axis=1), value_df], axis=1)
            if 'dateTime' in df.columns:
                df.rename(columns={'dateTime': 'Date'}, inplace=True)
    
    if 'Date' in df.columns:
        df['Date'] = pd.to_datetime(df['Date']).dt.date
        # Ensure value_col is numeric if it exists
        if value_col in df.columns:
            df[value_col] = pd.to_numeric(df[value_col], errors='coerce')
    else:
        return pd.DataFrame(columns=['Date', value_col])
    return df

def process_fitbit_files(user_dir):
    dfs = []
    
    # Simple metrics
    metrics = [
        ('fitbit/steps.json', 'steps'),
        ('fitbit/calories.json', 'calories'),
        ('fitbit/lightly_active_minutes.json', 'lightly_active_minutes'),
        ('fitbit/moderately_active_minutes.json', 'moderately_active_minutes'),
        ('fitbit/very_active_minutes.json', 'very_active_minutes')
    ]
    
    for file_path, col_name in metrics:
        df = load_json_to_df(os.path.join(user_dir, file_path), col_name)
        if not df.empty and col_name in df.columns:
            dfs.append(df.groupby('Date').sum().reset_index())
            
    # Resting heart rate (sometimes nested dict)
    rhr_df = load_json_to_df(os.path.join(user_dir, 'fitbit/resting_heart_rate.json'), 'resting_heart_rate')
    if not rhr_df.empty and 'resting_heart_rate' in rhr_df.columns:
        # Check if it's still a dict somehow
        if rhr_df['resting_heart_rate'].dtype == object and isinstance(rhr_df['resting_heart_rate'].dropna().iloc[0], dict):
             rhr_df['resting_heart_rate'] = rhr_df['resting_heart_rate'].apply(lambda x: x.get('value', np.nan) if isinstance(x, dict) else np.nan)
        rhr_df['resting_heart_rate'] = pd.to_numeric(rhr_df['resting_heart_rate'], errors='coerce')
        dfs.append(rhr_df.groupby('Date').mean().reset_index())
        
    # Sleep score (csv)
    sleep_score_path = os.path.join(user_dir, 'fitbit/sleep_score.csv')
    if os.path.exists(sleep_score_path):
        sleep_df = pd.read_csv(sleep_score_path)
        sleep_df['Date'] = pd.to_datetime(sleep_df['timestamp']).dt.date
        sleep_df = sleep_df.groupby('Date').mean(numeric_only=True).reset_index()
        cols_to_keep = ['Date', 'overall_score', 'deep_sleep_in_minutes', 'restlessness']
        cols = [c for c in cols_to_keep if c in sleep_df.columns]
        dfs.append(sleep_df[cols])
        
    if not dfs: return pd.DataFrame(columns=['Date'])
    
    merged_fitbit = dfs[0]
    for i in range(1, len(dfs)):
        merged_fitbit = pd.merge(merged_fitbit, dfs[i], on='Date', how='outer')
        
    return merged_fitbit

def build_feature_dataset(user_id):
    user_dir = os.path.join(base_dir, user_id)
    
    wellness_path = os.path.join(user_dir, 'pmsys/wellness.csv')
    if not os.path.exists(wellness_path):
        return pd.DataFrame()
        
    wellness_df = pd.read_csv(wellness_path)
    wellness_df['Date'] = pd.to_datetime(wellness_df['effective_time_frame']).dt.date
    wellness_features = ['Date', 'fatigue', 'mood', 'readiness', 'sleep_duration_h', 'sleep_quality', 'soreness', 'stress']
    wellness_df = wellness_df[[c for c in wellness_features if c in wellness_df.columns]]
    wellness_df = wellness_df.groupby('Date').mean().reset_index()
    
    fitbit_df = process_fitbit_files(user_dir)
    
    srpe_path = os.path.join(user_dir, 'pmsys/srpe.csv')
    if os.path.exists(srpe_path):
        srpe_df = pd.read_csv(srpe_path)
        if 'date' in srpe_df.columns:
            srpe_df['Date'] = pd.to_datetime(srpe_df['date']).dt.date
            srpe_df = srpe_df.groupby('Date').sum(numeric_only=True).reset_index()
            cols = ['Date', 'session_rpe'] if 'session_rpe' in srpe_df.columns else ['Date']
            srpe_df = srpe_df[[c for c in cols if c in srpe_df.columns]]
        elif 'Date' in srpe_df.columns:
            srpe_df['Date'] = pd.to_datetime(srpe_df['Date']).dt.date
            srpe_df = srpe_df.groupby('Date').sum(numeric_only=True).reset_index()
            cols = ['Date', 'session_rpe'] if 'session_rpe' in srpe_df.columns else ['Date']
            srpe_df = srpe_df[[c for c in cols if c in srpe_df.columns]]
        else:
            srpe_df = pd.DataFrame(columns=['Date'])
    else:
        srpe_df = pd.DataFrame(columns=['Date'])
        
    merged_df = pd.merge(wellness_df, fitbit_df, on='Date', how='left')
    if not srpe_df.empty and 'session_rpe' in srpe_df.columns:
        merged_df = pd.merge(merged_df, srpe_df, on='Date', how='left')
        
    merged_df.sort_values('Date', inplace=True)
    merged_df.ffill(inplace=True)
    merged_df.bfill(inplace=True)
    merged_df.fillna(0, inplace=True)
    
    if 'overall_score' in merged_df.columns:
        merged_df['sleep_3d_avg'] = merged_df['overall_score'].rolling(3, min_periods=1).mean()
        merged_df['sleep_7d_avg'] = merged_df['overall_score'].rolling(7, min_periods=1).mean()
        merged_df['sleep_score_yesterday'] = merged_df['overall_score'].shift(1)
        
    if 'steps' in merged_df.columns:
        merged_df['steps_yesterday'] = merged_df['steps'].shift(1)
        merged_df['steps_3d_avg'] = merged_df['steps'].rolling(3, min_periods=1).mean()
        
    if 'fatigue' in merged_df.columns:
        merged_df['fatigue_yesterday'] = merged_df['fatigue'].shift(1)
        merged_df['fatigue_3d_avg'] = merged_df['fatigue'].rolling(3, min_periods=1).mean()
        
    if 'stress' in merged_df.columns:
        merged_df['stress_yesterday'] = merged_df['stress'].shift(1)

    def mood_to_class(score):
        if score <= 2: return 'Low'
        if score <= 4: return 'Neutral'
        return 'High'

    if 'mood' in merged_df.columns:
        merged_df['mood_class'] = merged_df['mood'].apply(mood_to_class)
        
    merged_df.fillna(0, inplace=True)
    
    return merged_df

# %%
for user in users:
    df = build_feature_dataset(user)
    if not df.empty:
        df.to_csv(f'/home/fallen/Projects/Main_Project/research/results/features_{user}.csv', index=False)
        print(f"Processed and saved {len(df)} rows for {user}")

print("Done building features for all users.")
