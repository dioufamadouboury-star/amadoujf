import asyncio
import base64
import os
from dotenv import load_dotenv
from emergentintegrations.llm.openai.image_generation import OpenAIImageGeneration

load_dotenv()

# Prompts pour les 5 images du carrousel YAMA+
prompts = [
    "Professional flat lay photography of premium electronics: wireless headphones, smartphone, smartwatch, and wireless earbuds elegantly arranged on a pure white marble surface. Minimalist Apple-style aesthetic, soft shadows, premium luxury feel, 4K quality, studio lighting",
    
    "Elegant flat lay of modern home decoration items: a beautiful ceramic vase, scented candle, small succulent plant, and decorative books arranged on a light beige linen surface. Scandinavian minimalist style, warm natural lighting, premium interior design aesthetic",
    
    "Luxurious flat lay of beauty and wellness products: high-end perfume bottle, skincare serums in glass bottles, makeup brushes, and rose petals artistically arranged on soft pink marble. Feminine elegant aesthetic, soft diffused lighting, beauty brand style",
    
    "Modern kitchen appliances flat lay: sleek coffee machine, minimalist toaster, and premium blender arranged on a clean white kitchen counter. Contemporary design, stainless steel accents, professional product photography, Apple-inspired minimalism",
    
    "Stylish lifestyle flat lay combining tech and fashion: rose gold laptop, designer sunglasses, leather wallet, premium watch, and coffee cup on a light gray concrete surface. Modern professional aesthetic, Instagram-worthy composition, luxury lifestyle brand feel"
]

async def generate_images():
    api_key = os.environ.get('EMERGENT_LLM_KEY')
    if not api_key:
        print("ERROR: EMERGENT_LLM_KEY not found")
        return
    
    image_gen = OpenAIImageGeneration(api_key=api_key)
    
    # Create directory for images
    os.makedirs('/app/frontend/public/hero-images', exist_ok=True)
    
    for i, prompt in enumerate(prompts, 1):
        print(f"Generating image {i}/5: {prompt[:50]}...")
        try:
            images = await image_gen.generate_images(
                prompt=prompt,
                model="gpt-image-1",
                number_of_images=1
            )
            
            if images and len(images) > 0:
                filepath = f'/app/frontend/public/hero-images/hero-{i}.png'
                with open(filepath, 'wb') as f:
                    f.write(images[0])
                print(f"✅ Image {i} saved to {filepath}")
            else:
                print(f"❌ No image generated for prompt {i}")
        except Exception as e:
            print(f"❌ Error generating image {i}: {e}")

if __name__ == "__main__":
    asyncio.run(generate_images())
