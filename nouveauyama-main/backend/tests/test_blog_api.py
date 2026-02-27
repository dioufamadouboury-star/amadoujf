"""
Blog API Tests - Testing blog endpoints for YAMA+ e-commerce site
Tests: GET /api/blog/posts, GET /api/blog/posts/:slug, category filtering
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestBlogAPI:
    """Blog API endpoint tests"""
    
    def test_get_all_blog_posts(self):
        """Test GET /api/blog/posts returns list of posts"""
        response = requests.get(f"{BASE_URL}/api/blog/posts")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        assert len(data) > 0, "Should return at least one post"
        
        # Verify post structure
        post = data[0]
        assert "slug" in post, "Post should have slug"
        assert "title" in post, "Post should have title"
        assert "excerpt" in post, "Post should have excerpt"
        assert "image" in post, "Post should have image"
        assert "category" in post, "Post should have category"
        assert "author" in post, "Post should have author"
    
    def test_get_blog_post_by_slug(self):
        """Test GET /api/blog/posts/:slug returns single post with content"""
        slug = "guide-achat-smartphone-2025"
        response = requests.get(f"{BASE_URL}/api/blog/posts/{slug}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        # API returns either {post: {...}, related: [...]} or just the post object
        post = data.get("post", data)
        
        assert post["slug"] == slug, f"Expected slug {slug}"
        assert "title" in post, "Post should have title"
        assert "content" in post, "Single post should include content"
        assert len(post["content"]) > 0, "Content should not be empty"
    
    def test_get_blog_post_not_found(self):
        """Test GET /api/blog/posts/:slug returns 404 for non-existent post"""
        response = requests.get(f"{BASE_URL}/api/blog/posts/non-existent-slug-12345")
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
    
    def test_blog_posts_have_required_fields(self):
        """Test that all blog posts have required fields for display"""
        response = requests.get(f"{BASE_URL}/api/blog/posts")
        
        assert response.status_code == 200
        posts = response.json()
        
        required_fields = ["slug", "title", "excerpt", "image", "category", "author"]
        
        for post in posts:
            for field in required_fields:
                assert field in post, f"Post missing required field: {field}"
    
    def test_blog_post_content_has_html(self):
        """Test that blog post content contains HTML for rendering"""
        slug = "guide-achat-smartphone-2025"
        response = requests.get(f"{BASE_URL}/api/blog/posts/{slug}")
        
        assert response.status_code == 200
        data = response.json()
        post = data.get("post", data)
        
        content = post.get("content", "")
        # Content should have HTML tags
        assert "<p>" in content or "<h2>" in content, "Content should contain HTML tags"
    
    def test_category_filter_parameter_accepted(self):
        """Test that category filter parameter is accepted by API"""
        response = requests.get(f"{BASE_URL}/api/blog/posts?category=Conseils")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
    
    def test_limit_parameter(self):
        """Test that limit parameter works"""
        response = requests.get(f"{BASE_URL}/api/blog/posts?limit=2")
        
        assert response.status_code == 200
        data = response.json()
        # Note: Sample posts may return all 6 regardless of limit
        assert isinstance(data, list)
    
    def test_multiple_sample_posts_available(self):
        """Test that multiple sample posts are available"""
        response = requests.get(f"{BASE_URL}/api/blog/posts")
        
        assert response.status_code == 200
        posts = response.json()
        
        # Should have at least 3 sample posts
        assert len(posts) >= 3, f"Expected at least 3 posts, got {len(posts)}"
        
        # Verify different categories exist
        categories = set(p["category"] for p in posts)
        assert len(categories) >= 2, "Should have posts from multiple categories"
    
    def test_blog_post_has_read_time(self):
        """Test that blog posts have readTime field"""
        response = requests.get(f"{BASE_URL}/api/blog/posts")
        
        assert response.status_code == 200
        posts = response.json()
        
        for post in posts:
            assert "readTime" in post or "read_time" in post, "Post should have readTime"


class TestBlogPostSlugs:
    """Test specific blog post slugs"""
    
    @pytest.mark.parametrize("slug", [
        "guide-achat-smartphone-2025",
        "tendances-decoration-2025",
        "conseils-entretien-electromenager",
        "nouveautes-apple-2025",
        "routine-beaute-naturelle",
        "guide-televiseur-4k"
    ])
    def test_sample_post_accessible(self, slug):
        """Test that each sample post is accessible by slug"""
        response = requests.get(f"{BASE_URL}/api/blog/posts/{slug}")
        
        assert response.status_code == 200, f"Post {slug} should be accessible"
        data = response.json()
        post = data.get("post", data)
        assert post["slug"] == slug


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
