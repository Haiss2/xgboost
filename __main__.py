import pandas as pd
import xgboost as xgb
from sklearn.model_selection import ShuffleSplit
import numpy as np

# Load the data
df = pd.read_json("./code/u22-xgboost/data/input.json")

# Clean data: drop rows where observed_slippage or any feature is NaN or infinite
df.replace([np.inf, -np.inf], np.nan, inplace=True)
df.dropna(inplace=True)

# Extract target variable
observed_slippage = df['observed_slippage'].values

# Drop non-numeric columns
X = df.drop(['observed_slippage', 'symbol', 'exchange', 'market_type', 'side', 'timestamp'], axis=1)

# Split data into training and validation sets
rs = ShuffleSplit(n_splits=2, test_size=0.2, random_state=0)
train_index, valid_index = next(rs.split(X))

# Create DMatrix for training and validation
dtrain = xgb.DMatrix(X.values[train_index, :], label=observed_slippage[train_index])
dvalid = xgb.DMatrix(X.values[valid_index, :], label=observed_slippage[valid_index])

# Parameters for the model
params = {
    'objective': 'reg:squarederror',  # assuming regression task
    'max_depth': 5,
    'learning_rate': 0.1,
    # 'n_estimators': 100
}

# Train the model
model = xgb.train(params, dtrain, num_boost_round=100)

model.save_model('./code/u22-xgboost/model.json')


# Run prediction on the validation set
df = pd.DataFrame({'Actual observed slippage': observed_slippage[valid_index],
                   'Predicted value': model.predict(dvalid)})
print(df)

from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score
import numpy as np

# Get predictions for the validation set
predictions = model.predict(dvalid)

# Calculate MSE, RMSE, MAE, and R-squared
mse = mean_squared_error(observed_slippage[valid_index], predictions)
rmse = np.sqrt(mse)
mae = mean_absolute_error(observed_slippage[valid_index], predictions)
r2 = r2_score(observed_slippage[valid_index], predictions)

# Print the evaluation metrics
print(f"Mean Squared Error (MSE): {mse}")
print(f"Root Mean Squared Error (RMSE): {rmse}")
print(f"Mean Absolute Error (MAE): {mae}")
print(f"R-squared (R²): {r2}")
