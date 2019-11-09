## Data sources

```
python3 -m venv env
source env/bin/activate
pip install -r requirements.txt
```

```
python
from netCDF4 import Dataset
ds = Dataset('./sea_level_rise_rcp45_2020_2100.nc', mode='r')
ds.variables
ds.variables['SELECTED_COMPONENTS'][:]
ds.variables['TIME_bnds'][:]
ds.variables['LON'][:]
ds.variables['LAT90_90'][:]
```

`/noaa_climate_explorer`:

* Individual region downloads from https://noaa.maps.arcgis.com/apps/MapJournal/index.html?appid=8b910d9c7b9744ea94e07d82f5420782

`cmip5.csv`:

* Use backing data for https://www.carbonbrief.org/mapped-how-every-part-of-the-world-has-warmed-and-could-continue-to-warm
* CSV from their github repo: https://github.com/hausfath/warming_map/blob/master/gridcell_characteristics.csv

Sea level data:

* https://riskfinder.climatecentral.org
