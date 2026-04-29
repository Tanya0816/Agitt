import os
from typing import Optional
from dotenv import load_dotenv

load_dotenv()

Message = dict[str, str]

def get_llm_response(
        system_prompt: str,
        messages:list[Message],
        max_tokens:int=3000,
) -> str: 
    provider = os.getenv("LLM_Provider","claude").lower().strip()

    if provider == "claude":
        return _call_claude(system_prompt, messages, max_tokens)
    else:
        raise ValueError(
            f"Unknown LLM_Provider='{provider}'."
        )
 
async def _call_claude(
        system_prompt: str,
        messages: list[Message],
        max_tokens: int,
) -> str:
    try:
        import anthropic
    except ImportError:
        raise RuntimeError("anthropic package not installed. Run: pip install antrhopic")
    
    api_key = os.dotenv("Anthropic_API_KEY")
    if not api_key:
        raise RuntimeError(
            "Anthropic_API_KEY not set in .env"
        )
    
    client = anthropic.AsyncAntropic(api_key=api_key)

    response = await client.message.create(
        model="claude-opus-4-5",
        max_tokens=max_tokens,
        system=system_prompt,
        messages=messages,
    )

    return response.content[0].text

