"""
AI-Powered Normalizer Service
Translates internal hospital codes to official SBS codes
Port: 8000
"""

from fastapi import FastAPI, HTTPException, status
from pydantic import BaseModel, Field
from typing import Optional
import os
from dotenv import load_dotenv
import hashlib
import psycopg2
from psycopg2.extras import RealDictCursor
import google.generativeai as genai

load_dotenv()

app = FastAPI(
    title="SBS Normalizer Service",
    description="AI-Powered code normalization for SBS Integration",
    version="1.0.0"
)

# Configure Gemini AI
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
model = genai.GenerativeModel('gemini-pro')

# Database connection
def get_db_connection():
    return psycopg2.connect(
        host=os.getenv("DB_HOST", "localhost"),
        database=os.getenv("DB_NAME", "sbs_integration"),
        user=os.getenv("DB_USER", "postgres"),
        password=os.getenv("DB_PASSWORD"),
        port=os.getenv("DB_PORT", "5432")
    )


class InternalClaimItem(BaseModel):
    facility_id: int = Field(..., description="Unique facility identifier")
    internal_code: str = Field(..., description="Internal service code from HIS")
    description: str = Field(..., description="Service description in English or Arabic")


class NormalizedResponse(BaseModel):
    sbs_mapped_code: str
    official_description: str
    confidence: float
    mapping_source: str
    description_en: Optional[str] = None
    description_ar: Optional[str] = None


def generate_description_hash(description: str) -> str:
    """Generate SHA-256 hash of description for caching"""
    return hashlib.sha256(description.lower().strip().encode()).hexdigest()


def lookup_local_mapping(facility_id: int, internal_code: str) -> Optional[dict]:
    """
    Step 1: Lookup in local database for exact match
    """
    try:
        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        query = """
        SELECT 
            snm.sbs_code,
            snm.confidence,
            snm.mapping_source,
            smc.description_en,
            smc.description_ar
        FROM sbs_normalization_map snm
        JOIN facility_internal_codes fic ON snm.internal_code_id = fic.internal_code_id
        JOIN sbs_master_catalogue smc ON snm.sbs_code = smc.sbs_id
        WHERE fic.facility_id = %s 
          AND fic.internal_code = %s 
          AND snm.is_active = TRUE
          AND fic.is_active = TRUE
        LIMIT 1
        """
        
        cursor.execute(query, (facility_id, internal_code))
        result = cursor.fetchone()
        
        cursor.close()
        conn.close()
        
        return dict(result) if result else None
        
    except Exception as e:
        print(f"Database lookup error: {e}")
        return None


def check_ai_cache(description: str) -> Optional[dict]:
    """
    Check if AI has already processed this description
    """
    try:
        desc_hash = generate_description_hash(description)
        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        query = """
        SELECT 
            anc.suggested_sbs_code as sbs_code,
            anc.confidence_score as confidence,
            'ai_cached' as mapping_source,
            smc.description_en,
            smc.description_ar
        FROM ai_normalization_cache anc
        JOIN sbs_master_catalogue smc ON anc.suggested_sbs_code = smc.sbs_id
        WHERE anc.description_hash = %s
        """
        
        cursor.execute(query, (desc_hash,))
        result = cursor.fetchone()
        
        if result:
            # Update hit count and last accessed
            cursor.execute(
                "UPDATE ai_normalization_cache SET hit_count = hit_count + 1, last_accessed = NOW() WHERE description_hash = %s",
                (desc_hash,)
            )
            conn.commit()
        
        cursor.close()
        conn.close()
        
        return dict(result) if result else None
        
    except Exception as e:
        print(f"AI cache lookup error: {e}")
        return None


def ai_lookup_with_gemini(description: str) -> Optional[dict]:
    """
    Step 2: Use Gemini AI to find the best SBS code match
    """
    try:
        # First, get all available SBS codes for context
        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        cursor.execute("""
            SELECT sbs_id, description_en, description_ar, category 
            FROM sbs_master_catalogue 
            WHERE is_active = TRUE 
            LIMIT 100
        """)
        
        sbs_codes = cursor.fetchall()
        
        # Build context for AI
        sbs_context = "\n".join([
            f"- {code['sbs_id']}: {code['description_en']} ({code['category']})"
            for code in sbs_codes
        ])
        
        prompt = f"""
You are a medical billing expert. Given the following service description from a hospital:

"{description}"

And the available SBS codes:
{sbs_context}

Return ONLY the most appropriate SBS code ID (e.g., SBS-LAB-001) that matches this service.
If no exact match exists, return the closest match.
Return ONLY the code ID, nothing else.
"""
        
        response = model.generate_content(prompt)
        suggested_code = response.text.strip()
        
        # Validate the suggested code exists
        cursor.execute(
            "SELECT sbs_id, description_en, description_ar FROM sbs_master_catalogue WHERE sbs_id = %s",
            (suggested_code,)
        )
        
        result = cursor.fetchone()
        
        if result:
            # Cache the AI result
            desc_hash = generate_description_hash(description)
            try:
                cursor.execute("""
                    INSERT INTO ai_normalization_cache 
                    (description_hash, original_description, suggested_sbs_code, confidence_score)
                    VALUES (%s, %s, %s, %s)
                    ON CONFLICT (description_hash) DO UPDATE 
                    SET hit_count = ai_normalization_cache.hit_count + 1,
                        last_accessed = NOW()
                """, (desc_hash, description, suggested_code, 0.85))
                conn.commit()
            except Exception as cache_error:
                print(f"Cache insert error: {cache_error}")
            
            cursor.close()
            conn.close()
            
            return {
                "sbs_code": result['sbs_id'],
                "confidence": 0.85,
                "mapping_source": "ai",
                "description_en": result['description_en'],
                "description_ar": result['description_ar']
            }
        
        cursor.close()
        conn.close()
        return None
        
    except Exception as e:
        print(f"AI lookup error: {e}")
        return None


@app.get("/")
def root():
    return {
        "service": "SBS Normalizer Service",
        "version": "1.0.0",
        "status": "active"
    }


@app.get("/health")
def health_check():
    """Health check endpoint"""
    try:
        conn = get_db_connection()
        conn.close()
        return {"status": "healthy", "database": "connected"}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Database connection failed: {str(e)}"
        )


@app.post("/normalize", response_model=NormalizedResponse)
def normalize_code(item: InternalClaimItem):
    """
    Main normalization endpoint
    
    Workflow:
    1. Check local database for exact mapping
    2. Check AI cache for previously processed descriptions
    3. If not found, use Gemini AI for dynamic lookup
    4. Return normalized SBS code with confidence score
    """
    
    # Step 1: Local database lookup
    local_result = lookup_local_mapping(item.facility_id, item.internal_code)
    if local_result:
        return NormalizedResponse(
            sbs_mapped_code=local_result['sbs_code'],
            official_description=local_result['description_en'],
            confidence=float(local_result.get('confidence', 1.0)),
            mapping_source=local_result.get('mapping_source', 'manual'),
            description_en=local_result['description_en'],
            description_ar=local_result['description_ar']
        )
    
    # Step 2: Check AI cache
    cached_result = check_ai_cache(item.description)
    if cached_result:
        return NormalizedResponse(
            sbs_mapped_code=cached_result['sbs_code'],
            official_description=cached_result['description_en'],
            confidence=float(cached_result['confidence']),
            mapping_source=cached_result['mapping_source'],
            description_en=cached_result['description_en'],
            description_ar=cached_result['description_ar']
        )
    
    # Step 3: AI-powered lookup
    ai_result = ai_lookup_with_gemini(item.description)
    if ai_result:
        return NormalizedResponse(
            sbs_mapped_code=ai_result['sbs_code'],
            official_description=ai_result['description_en'],
            confidence=ai_result['confidence'],
            mapping_source=ai_result['mapping_source'],
            description_en=ai_result['description_en'],
            description_ar=ai_result['description_ar']
        )
    
    # No mapping found
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail=f"No SBS mapping found for internal code: {item.internal_code}"
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
