import asyncio
import os
from dotenv import load_dotenv
from emergentintegrations.llm.openai.image_generation import OpenAIImageGeneration

load_dotenv()

async def generate_sofa_image():
    api_key = os.environ.get('EMERGENT_LLM_KEY')
    if not api_key:
        print("ERROR: EMERGENT_LLM_KEY not found")
        return
    
    image_gen = OpenAIImageGeneration(api_key=api_key)
    
    prompt = "Elegant modern living room with a luxurious velvet sofa in soft beige or cream color, minimalist Scandinavian interior design, beautiful decorative cushions, a small coffee table with a plant, soft natural lighting from large windows, premium furniture showroom aesthetic, clean and sophisticated, 4K quality photography"
    
    print(f"Generating furniture/sofa image...")
    try:
        images = await image_gen.generate_images(
            prompt=prompt,
            model="gpt-image-1",
            number_of_images=1
        )
        
        if images and len(images) > 0:
            filepath = '/app/frontend/public/hero-images/hero-3.png'
            with open(filepath, 'wb') as f:
                f.write(images[0])
            print(f"✅ Sofa/Mobilier image saved to {filepath}")
        else:
            print("❌ No image generated")
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    asyncio.run(generate_sofa_image())
