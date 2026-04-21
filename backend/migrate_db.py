from sqlalchemy import create_engine, text
import os

SQLALCHEMY_DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://postgres:password@127.0.0.1:5433/travel_db"
)

def migrate():
    engine = create_engine(SQLALCHEMY_DATABASE_URL)
    with engine.connect() as conn:
        print("Checking for ml_tags column...")
        # PostgreSQL specific check for column existence
        check_query = text("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='photos' AND column_name='ml_tags';
        """)
        result = conn.execute(check_query).fetchone()
        
        if not result:
            print("Adding ml_tags column to photos table...")
            conn.execute(text("ALTER TABLE photos ADD COLUMN ml_tags TEXT;"))
            conn.commit()
            print("Successfully added ml_tags column.")
        else:
            print("ml_tags column already exists.")

if __name__ == "__main__":
    try:
        migrate()
    except Exception as e:
        print(f"Migration failed: {e}")
