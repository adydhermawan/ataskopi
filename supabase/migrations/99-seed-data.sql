
-- Seed Data for AtasKopi

-- 0. Install Extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;

-- 1. Create Tenant
INSERT INTO public.tenants (id, business_name, tenant_slug, business_type, status, updated_at)
VALUES ('d290f1ee-6c54-4b01-90e6-d701748f0851', 'AtasKopi', 'ataskopi', 'coffee_shop', 'active', now())
ON CONFLICT (id) DO UPDATE SET 
    business_name = EXCLUDED.business_name,
    tenant_slug = EXCLUDED.tenant_slug;

-- 2. Create Outlet
INSERT INTO public.outlets (id, tenant_id, name, address, is_active)
VALUES 
('f47ac10b-58cc-4372-a567-0e02b2c3d479', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'AtasKopi Central Park', 'Central Park Mall, Jakarta Barat', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Create Admin User (Auth & User)
-- Insert into auth.users (This simulates GoTrue registration)
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, role, aud, created_at, updated_at)
VALUES 
(
    'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d', 
    'admin@ataskopi.com', 
    public.crypt('admin123', public.gen_salt('bf')), -- Password: admin123
    now(), 
    'authenticated', 
    'authenticated',
    now(),
    now()
)
ON CONFLICT (id) DO NOTHING;

-- Insert into public.users (Matching Prisma Schema)
-- Providing Phone + PIN for Flutter App Login
INSERT INTO public.users (id, tenant_id, phone, name, email, pin_hash, role, created_at, updated_at, total_spent)
VALUES 
(
    'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d', 
    'd290f1ee-6c54-4b01-90e6-d701748f0851', 
    '+6281234567890', 
    'Super Admin', 
    'admin@ataskopi.com',
    public.crypt('123456', public.gen_salt('bf')), -- PIN: 123456
    'admin', 
    now(), 
    now(),
    0
)
ON CONFLICT (id) DO UPDATE SET 
    phone = EXCLUDED.phone,
    pin_hash = EXCLUDED.pin_hash;

-- 4. Create Initial Categories
INSERT INTO public.categories (id, tenant_id, name, slug, sort_order)
VALUES 
('c1010000-0000-0000-0000-000000000001', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'Coffee', 'coffee', 1),
('c1030000-0000-0000-0000-000000000003', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'Food', 'food', 3)
ON CONFLICT (id) DO NOTHING;

-- 5. Create Products
INSERT INTO public.products (id, tenant_id, category_id, name, description, base_price, image_url, is_available, is_recommended, created_at, updated_at)
VALUES 
-- Coffee
('p2010000-0000-0000-0000-000000000001', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'c1010000-0000-0000-0000-000000000001', 'Aren Latte', 'Signature palm sugar latte', 25000, 'https://placehold.co/400x400/1250A5/FFFFFF/png?text=Aren+Latte', true, true, now(), now()),
('p2010000-0000-0000-0000-000000000002', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'c1010000-0000-0000-0000-000000000001', 'Americano', 'Espresso with water', 20000, 'https://placehold.co/400x400/000000/FFFFFF/png?text=Americano', true, false, now(), now()),
-- Food
('p2030000-0000-0000-0000-000000000001', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'c1030000-0000-0000-0000-000000000003', 'Croissant', 'Butter croissant', 18000, 'https://placehold.co/400x400/FFA500/FFFFFF/png?text=Croissant', true, false, now(), now())
ON CONFLICT (id) DO NOTHING;

-- 5. Create Promos (Home Banners)
INSERT INTO public.promos (id, tenant_id, title, description, banner_url, is_active, display_order, updated_at)
VALUES 
('p1010000-0000-0000-0000-000000000001', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'Special Offer', 'Get 50% off on all coffee items!', 'https://placehold.co/600x300/1250A5/FFFFFF/png?text=Special+Offer', true, 1, now()),
('p1020000-0000-0000-0000-000000000002', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'New Arrival', 'Try our new Single Origin beans.', 'https://placehold.co/600x300/FFB400/000000/png?text=New+Arrival', true, 2, now())
ON CONFLICT (id) DO NOTHING;

-- 6. Create Notifications
INSERT INTO public.notifications (id, tenant_id, user_id, category, title, message, is_read)
VALUES 
('n1010000-0000-0000-0000-000000000001', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d', 'promo', 'Welcome to AtasKopi!', 'Thanks for joining. Enjoy your first coffee on us!', false),
('n1020000-0000-0000-0000-000000000002', 'd290f1ee-6c54-4b01-90e6-d701748f0851', 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d', 'order', 'Order #123 Completed', 'Your order has been completed. Please rate your experience.', true)
ON CONFLICT (id) DO NOTHING;
