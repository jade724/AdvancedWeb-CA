from django.contrib.gis.db import models

class Station(models.Model):
    name = models.CharField(max_length=100)
    station_type = models.CharField(max_length=50)
    fuel_price = models.DecimalField(max_digits=4, decimal_places=2)
    geom = models.PointField(geography=True)  # 👈 Must match geo_field above
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name} ({self.station_type})"
