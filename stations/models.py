from django.db import models

class Station(models.Model):
    STATION_TYPES = [
        ("petrol", "Petrol station"),
        ("ev", "EV charger"),
    ]

    name = models.CharField(max_length=255)
    station_type = models.CharField(max_length=20, choices=STATION_TYPES)
    fuel_price = models.FloatField(null=True, blank=True)
    latitude = models.FloatField()
    longitude = models.FloatField()

    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name
