# RouteTO Data Directory

This directory contains crime data CSV files used by the RouteTO application.

## Getting the Data

Since the CSV files are large (100MB+), they are not stored in Git. To get the application working:

### Option 1: Download Toronto Crime Data
1. Visit: https://open.toronto.ca/dataset/major-crime-indicators/
2. Download the CSV file (Major Crime Indicators)
3. Place it in this directory as: `Major_Crime_Indicators_Open_Data_*.csv`

### Option 2: Use Any Crime CSV
The application can work with any crime CSV that has these columns:
- **Latitude** (LAT_WGS84, Latitude, Y, y)
- **Longitude** (LONG_WGS84, Longitude, X, x)  
- **Date** (occurrence_date, Date, reported_date, date_occured, occurrenceyear)
- **Crime Type** (offence, offense, category, crime, event_type, MCI_CATEGORY)

### Option 3: Download Script
Run the download script (if available):
```bash
./download_data.sh
```

## File Structure
```
data/
├── README.md (this file)
└── Major_Crime_Indicators_Open_Data_*.csv (download required)
```

## Note
- All `*.csv` files in this directory are ignored by Git (see .gitignore)
- This keeps the repository lightweight while allowing local development
- The backend will automatically detect and use any CSV file in this directory
