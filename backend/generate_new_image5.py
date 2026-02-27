import asyncio
import os
from dotenv import load_dotenv
from emergentintegrations.llm.openai.image_generation import OpenAIImageGeneration

load_dotenv()

async def generate_image():
    api_key = os.environ.get('EMERGENT_LLM_KEY')
    if not api_key:
        print("ERROR: EMERGENT_LLM_KEY not found")
        return
    
    image_gen = OpenAIImageGeneration(api_key=api_key)
    
    prompt = "Beautiful flat lay of premium beauty products: elegant perfume bottles, high-end makeup palette, lipsticks, and skincare products artistically arranged on a soft pink marble surface. Luxury beauty brand aesthetic, soft diffused lighting, feminine and sophisticated, 4K professional product photography"
    
    print(f"Generating beauty products image...")
    try:
        images = await image_gen.generate_images(
            prompt=prompt,
            model="gpt-image-1",
            number_of_images=1
        )
        
        if images and len(images) > 0:
            filepath = '/app/frontend/public/hero-images/hero-5.png'
            with open(filepath, 'wb') as f:
                f.write(images[0])
            print(f"✅ Beauty image saved to {filepath}")
        else:
            print("❌ No image generated")
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    asyncio.run(generate_image())
