from rest_framework import serializers
from .models import Station

class StationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Station
        fields = [
            "id",
            "name",
            "station_type",
            "fuel_price",
            "latitude",
            "longitude",
            "updated_at",
        ]
