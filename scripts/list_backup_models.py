import os, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from dotenv import load_dotenv
from openai import OpenAI

load_dotenv(Path(__file__).resolve().parent.parent / ".env")
c = OpenAI(api_key=os.getenv("BACKUP_API_KEY"), base_url=os.getenv("BACKUP_BASE_URL"))
for m in c.models.list().data:
    print(m.id)