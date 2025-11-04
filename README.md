**File name:** `README.md` 

```markdown
# ⛽ FuelSmart Finder
> **Find the nearest Petrol or EV charging stations across Ireland** — built with **Django**, **Leaflet**, and **PostGIS**.

---

## 🚀 Features
- 🗺️ Interactive Leaflet map (click anywhere 5 km radius search)  
- 🔴 Petrol vs 🟡 EV markers  
- 💬 Pop-ups with station name, type & price  
- 🧭 Nearby & Cheapest station endpoints  
- 📱 Responsive Bootstrap layout  
- 🧩 GeoDjango API returning GeoJSON  

---

## 🧠 Tech Stack
| Layer | Technology |
|--------|-------------|
| Backend | Django 5 + REST Framework |
| Database | PostgreSQL + PostGIS |
| Frontend | Leaflet JS + Bootstrap 5 |
| Data Format | GeoJSON |


---

## ⚙️ Setup Guide
```bash
# 1. Clone
git clone https://github.com/yourusername/fuelsmart.git
cd fuelsmart

# 2. Create and activate virtual env
python -m venv venv
source venv/bin/activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Migrate database
python manage.py migrate

# 5. Create admin user
python manage.py createsuperuser

# 6. Run server
python manage.py runserver
Then open: