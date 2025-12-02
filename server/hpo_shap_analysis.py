import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestRegressor
from sklearn.preprocessing import LabelEncoder, OneHotEncoder
import sklearn
import shap
async def calculate_shap_value(trials):
    try:
        df = pd.DataFrame(trials)
        
        
        if 'metric' not in df.columns:
            raise ValueError("'metric' column is required.")
        
        df_clean = df.dropna(subset=['metric'])
        
        if len(df_clean) != len(df):
            nan_count = len(df) - len(df_clean)
            print(f"Warning: {nan_count} trials excluded due to missing metric values.")
        
        
        if len(df_clean) < 2:
            print("Warning: Insufficient data. At least 2 complete trials required.")
            return None, None
        
        features = df_clean.drop(columns=['metric'])
        
        
        features_clean = features.dropna()
        if len(features_clean) != len(features):
            
            valid_indices = features_clean.index
            df_clean = df_clean.loc[valid_indices]
            features = features_clean
        
        if len(df_clean) < 2:
            print("Warning: Insufficient data after removing NaN values.")
            return None, None
        
        X_processed, feature_names, encoders = preprocess_hyperparameters_simple(features)
        y = df_clean["metric"]
        
        
        if y.isna().any():
            print("Warning: y values still contain NaN. Removing them.")
            valid_mask = ~y.isna()
            y = y[valid_mask]
            X_processed = X_processed[valid_mask]
            df_clean = df_clean[valid_mask]
        
        
        if len(df_clean) < 10:
            model = RandomForestRegressor(n_estimators=50, max_depth=3, random_state=42)
        else:
            model = RandomForestRegressor(n_estimators=100, random_state=42)
            
        model.fit(X_processed, y)
        
        
        explainer = shap.TreeExplainer(model)
        shap_values = explainer.shap_values(X_processed)
        
        
        base_value_raw = explainer.expected_value
        
        
        if isinstance(base_value_raw, np.ndarray):
            if base_value_raw.shape == ():
                base_value = float(base_value_raw.item())
            elif len(base_value_raw) == 1:
                base_value = float(base_value_raw[0])
            else:
                base_value = float(base_value_raw.mean())
        else:
            base_value = float(base_value_raw)
        
        value_impact_analysis = analyze_value_impacts_simple(
            X_processed, shap_values, feature_names, df_clean, encoders
        )
        
        importance = np.abs(shap_values).mean(0)
        importance_ranking = [(feature_names[i], float(importance[i])) for i in range(len(feature_names))]
        importance_ranking.sort(key=lambda x: x[1], reverse=True)
        
        for i, (name, imp) in enumerate(importance_ranking[:5]):
            print(f"{i+1}. {name}: {imp:.4f}")
        
        
        
        client_data = {
            'baseValue': base_value,
            'valueImpacts': value_impact_analysis,
            'importanceRanking': importance_ranking
        }
        
        return client_data
        
    except Exception as e:
        print(f"SHAP analysis error: {e}")
        import traceback
        traceback.print_exc()
        return None
def analyze_value_impacts_simple(X_processed, shap_values, feature_names, original_df, encoders):
    value_impacts = {}
    
    for param_idx, param_name in enumerate(feature_names):
        param_shap_values = shap_values[:, param_idx]
        param_encoded_values = X_processed[:, param_idx]
        
        original_param_name = param_name
        
        
        if original_param_name in original_df.columns:
            original_values = original_df[original_param_name].values
        else:
            
            original_values = decode_values(original_param_name, param_encoded_values, encoders)
        
        
        metric_values = original_df['metric'].values
        
        
        param_value_impacts = {}
        
        for i, (orig_val, shap_val, metric_val) in enumerate(zip(original_values, param_shap_values, metric_values)):
            
            value_key = str(orig_val)

            if pd.isna(shap_val):
                
                if value_key not in param_value_impacts:
                    param_value_impacts[value_key] = {
                        'shapValues': [],
                        'metricValues': [],
                        'count': 0,
                        'totalImpact': 0.0,
                        'meanImpact': 0.0
                    }
                
                if not pd.isna(metric_val):
                    param_value_impacts[value_key]['metricValues'].append(float(metric_val))
                continue
            
            
            if pd.isna(metric_val):
                continue
                
            
            if isinstance(orig_val, (np.integer, np.floating)):
                orig_val = orig_val.item()
            if isinstance(shap_val, (np.integer, np.floating)):
                shap_val = shap_val.item()
            if isinstance(metric_val, (np.integer, np.floating)):
                metric_val = metric_val.item()
                
            
            if isinstance(orig_val, np.ndarray):
                orig_val = orig_val.tolist()
            elif hasattr(orig_val, 'item'):  # numpy scalar
                orig_val = orig_val.item()
                
            
            if value_key not in param_value_impacts:
                param_value_impacts[value_key] = {
                    'shapValues': [],
                    'metricValues': [],
                    'count': 0,
                    'totalImpact': 0.0,
                    'meanImpact': 0.0
                }
            
            param_value_impacts[value_key]['shapValues'].append(float(shap_val))
            param_value_impacts[value_key]['metricValues'].append(float(metric_val))
            param_value_impacts[value_key]['count'] += 1
            param_value_impacts[value_key]['totalImpact'] += float(shap_val)
        
        
        for value_info in param_value_impacts.values():
            if value_info['count'] > 0:
                value_info['meanImpact'] = value_info['totalImpact'] / value_info['count']
        
        value_impacts[param_name] = {
            'values': param_value_impacts
        }
    
    return value_impacts

def decode_values(param_name, encoded_values, encoders):
    """Decode encoded values back to original values"""
    try:
        if param_name in encoders:
            encoder_info = encoders[param_name]
            if encoder_info['type'] == 'label' and 'encoder' in encoder_info:
                encoder = encoder_info['encoder']
                return encoder.inverse_transform(encoded_values.astype(int))
            elif encoder_info['type'] == 'boolean':
                return [bool(x) for x in encoded_values]
        
        
        return encoded_values
    except:
        return encoded_values

def print_value_impacts(value_impacts):
    """Print value impacts"""
    for param_name, param_info in value_impacts.items():
        print(f"\n📌 {param_name} ({param_info['original_parameter']}):")
        
        
        sorted_values = sorted(param_info['values'].items(), 
                             key=lambda x: abs(x[1]['mean_impact']), reverse=True)
        
        for value_key, value_info in sorted_values:
            impact = value_info['mean_impact']
            count = value_info['count']
            impact_sign = "🔺" if impact > 0 else "🔻" if impact < 0 else "➖"
            
            print(f"  {impact_sign} {value_info['value']}: {impact:+.4f} (used {count} times)")

def preprocess_hyperparameters_simple(features_df):
    """Simple version - Label Encoding only"""
    processed_features = []
    feature_names = []
    encoders = {}
    
    for column in features_df.columns:
        col_data = features_df[column]
        
        
        if col_data.isna().any():
            print(f"Warning: {column} column contains NaN values.")
            continue
        
        
        if col_data.nunique() <= 1:
            print(f"Warning: {column} column has only one unique value, skipping.")
            continue
        
        
        if pd.api.types.is_numeric_dtype(col_data):
            processed_features.append(col_data.values.reshape(-1, 1))
            feature_names.append(column)
            
        
        elif col_data.dtype == bool:
            bool_encoded = col_data.astype(int).values.reshape(-1, 1)
            processed_features.append(bool_encoded)
            feature_names.append(column)
            encoders[column] = {'type': 'boolean'}
            
        
        else:
            encoder = LabelEncoder()
            encoded = encoder.fit_transform(col_data.astype(str)).reshape(-1, 1)
            processed_features.append(encoded)
            feature_names.append(column)
            encoders[column] = {'type': 'label', 'encoder': encoder, 'classes': encoder.classes_}
    
    if not processed_features:
        raise ValueError("No processable features found.")
    
    X_processed = np.hstack(processed_features)
    return X_processed, feature_names, encoders