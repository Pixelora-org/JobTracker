"""Google Gemini client wrapper."""

import google.generativeai as genai
from typing import Type, TypeVar
from pydantic import BaseModel
import json
from app.config import settings

T = TypeVar("T", bound=BaseModel)


class GeminiClient:
    """Wrapper for Google Gemini API with structured output support."""
    
    def __init__(self):
        if not settings.google_generative_ai_api_key:
            raise ValueError(
                "GOOGLE_GENERATIVE_AI_API_KEY is required. "
                "Set it in your environment variables."
            )
        
        genai.configure(api_key=settings.google_generative_ai_api_key)
        self.model = genai.GenerativeModel(settings.ai_model)
    
    async def generate_object(
        self,
        schema: Type[T],
        system_prompt: str,
        user_prompt: str,
        temperature: float = 0.7
    ) -> T:
        """Generate structured output matching the Pydantic schema.
        
        Args:
            schema: Pydantic model class to validate output
            system_prompt: System instructions
            user_prompt: User prompt with context
            temperature: Model temperature (0-1)
            
        Returns:
            Validated instance of schema type
            
        Raises:
            ValueError: If generation fails or output is invalid
        """
        # Create the JSON schema for the model
        json_schema = schema.model_json_schema()
        
        # Build the full prompt
        full_prompt = f"""{system_prompt}

You must respond with valid JSON matching this schema:
{json.dumps(json_schema, indent=2)}

{user_prompt}"""
        
        try:
            # Configure for JSON output
            generation_config = genai.GenerationConfig(
                temperature=temperature,
                response_mime_type="application/json"
            )
            
            response = self.model.generate_content(
                full_prompt,
                generation_config=generation_config
            )
            
            # Parse and validate response
            result_text = response.text.strip()
            result_data = json.loads(result_text)
            
            return schema.model_validate(result_data)
            
        except json.JSONDecodeError as e:
            raise ValueError(f"Failed to parse LLM response as JSON: {e}")
        except Exception as e:
            raise ValueError(f"LLM generation failed: {e}")
