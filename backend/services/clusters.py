import pandas as pd
from sklearn.cluster import KMeans

def kmeans_clusters(df: pd.DataFrame, k: int = 30, max_points: int = 50_000):
    if df.empty: return []
    if len(df) > max_points:
        df = df.sample(max_points, random_state=42)
    X = df[["lng","lat"]].to_numpy()
    k = max(1, min(k, len(X)))
    km = KMeans(n_clusters=k, n_init="auto", random_state=42)
    labels = km.fit_predict(X)
    centers = km.cluster_centers_  # lng, lat
    counts = pd.Series(labels).value_counts().sort_index().tolist()
    return [{"center_lat": float(lat), "center_lng": float(lng), "count": int(c)}
            for (lng,lat), c in zip(centers, counts)]
