
## Data Setup

Due to GitHub's 100MB file size limit, the crime data CSV is not included in this repository.

### To get the app working:

1. Download Toronto Police crime data:
   - Visit: https://open.toronto.ca/dataset/major-crime-indicators/
   - Download the CSV file
   - Place it in the `data/` directory as: `Major_Crime_Indicators_Open_Data_-3805566126367379926.csv`

2. Or use any Toronto crime CSV with columns: `LAT_WGS84`, `LONG_WGS84`, `MCI_CATEGORY`, `OCC_DATE`

### API Endpoints

- Health: `GET /api/health`
- Crimes: `GET /api/crimes?start=YYYY-MM-DD&end=YYYY-MM-DD&limit=100`
- Clusters: `GET /api/clusters?k=10`
- Interactive docs: `http://localhost:PORT/docs`

