import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestRegressor
from sklearn.preprocessing import LabelEncoder, OneHotEncoder
import sklearn
import shap
async def calculate_shap_value(trials):
    try:
        df = pd.DataFrame(trials)
        
        # 필수 컬럼 확인
        if 'metric' not in df.columns:
            raise ValueError("'metric' 컬럼이 필요합니다.")
        
        df_clean = df.dropna(subset=['metric'])
        
        if len(df_clean) != len(df):
            nan_count = len(df) - len(df_clean)
            print(f"⚠️ {nan_count}개의 trial에서 metric 값이 누락되어 제외되었습니다.")
        
        # 데이터가 충분한지 확인
        if len(df_clean) < 2:
            print("⚠️ 유효한 데이터가 부족합니다. 최소 2개의 완전한 trial이 필요합니다.")
            return None, None
        
        features = df_clean.drop(columns=['metric'])
        
        # features에서도 NaN 확인 및 처리
        features_clean = features.dropna()
        if len(features_clean) != len(features):
            # metric도 같은 인덱스로 필터링
            valid_indices = features_clean.index
            df_clean = df_clean.loc[valid_indices]
            features = features_clean
        
        if len(df_clean) < 2:
            print("⚠️ NaN 제거 후 데이터가 부족합니다.")
            return None, None
        
        X_processed, feature_names, encoders = preprocess_hyperparameters_simple(features)
        y = df_clean["metric"]
        
        # y에 여전히 NaN이 있는지 최종 확인
        if y.isna().any():
            print("⚠️ y 값에 여전히 NaN이 있습니다. 추가 제거합니다.")
            valid_mask = ~y.isna()
            y = y[valid_mask]
            X_processed = X_processed[valid_mask]
            df_clean = df_clean[valid_mask]
        
        # 모델 학습
        if len(df_clean) < 10:
            model = RandomForestRegressor(n_estimators=50, max_depth=3, random_state=42)
        else:
            model = RandomForestRegressor(n_estimators=100, random_state=42)
            
        model.fit(X_processed, y)
        
        # SHAP 분석
        explainer = shap.TreeExplainer(model)
        shap_values = explainer.shap_values(X_processed)
        
        # Base value (전체 평균 예측값) - numpy array를 float로 변환
        base_value_raw = explainer.expected_value
        
        # base_value가 array인 경우 처리
        if isinstance(base_value_raw, np.ndarray):
            if base_value_raw.shape == ():  # 0차원 배열
                base_value = float(base_value_raw.item())
            elif len(base_value_raw) == 1:  # 1차원 배열의 첫 번째 요소
                base_value = float(base_value_raw[0])
            else:
                base_value = float(base_value_raw.mean())  # 다차원인 경우 평균
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
        
        
        # Client로 전송할 JSON 직렬화 가능한 데이터만 반환
        client_data = {
            'baseValue': base_value,
            'valueImpacts': value_impact_analysis,
            'importanceRanking': importance_ranking
        }
        
        return client_data  # DataFrame 제외하고 필요한 3개 항목만 반환
        
    except Exception as e:
        print(f"SHAP 분석 중 오류 발생: {e}")
        import traceback
        traceback.print_exc()
        return None
def analyze_value_impacts_simple(X_processed, shap_values, feature_names, original_df, encoders):
    value_impacts = {}
    
    for param_idx, param_name in enumerate(feature_names):
        param_shap_values = shap_values[:, param_idx]
        param_encoded_values = X_processed[:, param_idx]
        
        original_param_name = param_name
        
        # 원래 값들 가져오기
        if original_param_name in original_df.columns:
            original_values = original_df[original_param_name].values
        else:
            # 디코딩 시도
            original_values = decode_values(original_param_name, param_encoded_values, encoders)
        
        # metric 값들 가져오기
        metric_values = original_df['metric'].values
        
        # 각 값별로 SHAP 영향력 계산
        param_value_impacts = {}
        
        for i, (orig_val, shap_val, metric_val) in enumerate(zip(original_values, param_shap_values, metric_values)):
            # NaN 값 처리
            if pd.isna(orig_val) or pd.isna(shap_val) or pd.isna(metric_val):
                continue
                
            # 값이 numpy 타입인 경우 Python 타입으로 변환
            if isinstance(orig_val, (np.integer, np.floating)):
                orig_val = orig_val.item()
            if isinstance(shap_val, (np.integer, np.floating)):
                shap_val = shap_val.item()
            if isinstance(metric_val, (np.integer, np.floating)):
                metric_val = metric_val.item()
                
            # JSON 직렬화를 위해 모든 값을 기본 Python 타입으로 변환
            if isinstance(orig_val, np.ndarray):
                orig_val = orig_val.tolist()
            elif hasattr(orig_val, 'item'):  # numpy scalar
                orig_val = orig_val.item()
                
            value_key = str(orig_val)
            
            if value_key not in param_value_impacts:
                param_value_impacts[value_key] = {
                    'shapValues': [],
                    'metricValues': [],  # 더 명확한 이름
                    'count': 0,
                    'totalImpact': 0.0,
                    'meanImpact': 0.0
                }
            
            param_value_impacts[value_key]['shapValues'].append(float(shap_val))
            param_value_impacts[value_key]['metricValues'].append(float(metric_val))  # metric 값 저장
            param_value_impacts[value_key]['count'] += 1
            param_value_impacts[value_key]['totalImpact'] += float(shap_val)
        
        # 평균 계산
        for value_info in param_value_impacts.values():
            if value_info['count'] > 0:
                value_info['meanImpact'] = value_info['totalImpact'] / value_info['count']
        
        value_impacts[param_name] = {
            'values': param_value_impacts
        }
    
    return value_impacts

def decode_values(param_name, encoded_values, encoders):
    """인코딩된 값을 원래 값으로 디코딩"""
    try:
        if param_name in encoders:
            encoder_info = encoders[param_name]
            if encoder_info['type'] == 'label' and 'encoder' in encoder_info:
                encoder = encoder_info['encoder']
                return encoder.inverse_transform(encoded_values.astype(int))
            elif encoder_info['type'] == 'boolean':
                return [bool(x) for x in encoded_values]
        
        # 디코딩할 수 없으면 인코딩된 값 그대로 반환
        return encoded_values
    except:
        return encoded_values

def print_value_impacts(value_impacts):
    """값별 영향력 출력"""
    for param_name, param_info in value_impacts.items():
        print(f"\n📌 {param_name} ({param_info['original_parameter']}):")
        
        # 평균 영향력 순으로 정렬
        sorted_values = sorted(param_info['values'].items(), 
                             key=lambda x: abs(x[1]['mean_impact']), reverse=True)
        
        for value_key, value_info in sorted_values:
            impact = value_info['mean_impact']
            count = value_info['count']
            impact_sign = "🔺" if impact > 0 else "🔻" if impact < 0 else "➖"
            
            print(f"  {impact_sign} {value_info['value']}: {impact:+.4f} (사용 {count}회)")

def preprocess_hyperparameters_simple(features_df):
    """간단한 버전 - Label Encoding만 사용"""
    processed_features = []
    feature_names = []
    encoders = {}
    
    for column in features_df.columns:
        col_data = features_df[column]
        
        # NaN 값이 있는 컬럼 체크
        if col_data.isna().any():
            print(f"⚠️ {column} 컬럼에 NaN 값이 있습니다.")
            continue
        
        # 단일 값 건너뛰기
        if col_data.nunique() <= 1:
            print(f"⚠️ {column} 컬럼은 단일 값만 가지므로 건너뜁니다.")
            continue
        
        # 1. 숫자형은 그대로 사용
        if pd.api.types.is_numeric_dtype(col_data):
            processed_features.append(col_data.values.reshape(-1, 1))
            feature_names.append(column)
            
        # 2. 불린형은 0, 1로 변환
        elif col_data.dtype == bool:
            bool_encoded = col_data.astype(int).values.reshape(-1, 1)
            processed_features.append(bool_encoded)
            feature_names.append(column)
            encoders[column] = {'type': 'boolean'}
            
        # 3. 범주형은 모두 Label Encoding
        else:
            encoder = LabelEncoder()
            encoded = encoder.fit_transform(col_data.astype(str)).reshape(-1, 1)
            processed_features.append(encoded)
            feature_names.append(column)
            encoders[column] = {'type': 'label', 'encoder': encoder, 'classes': encoder.classes_}
    
    if not processed_features:
        raise ValueError("처리할 수 있는 피처가 없습니다.")
    
    X_processed = np.hstack(processed_features)
    return X_processed, feature_names, encoders