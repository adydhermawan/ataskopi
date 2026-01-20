import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import '../../../shared/data/mock_data.dart';
import '../../../shared/domain/models/models.dart';
import '../../../menu/presentation/widgets/product_detail_modal.dart';

class ProductRecommendationList extends StatelessWidget {
  const ProductRecommendationList({super.key});

  @override
  Widget build(BuildContext context) {
    final recommendedProducts = MockData.products.where((p) => p.isRecommended).toList();

    return SizedBox(
      height: 260.h,
      child: ListView.builder(
        scrollDirection: Axis.horizontal,
        padding: EdgeInsets.only(left: 20.w, right: 8.w),
        itemCount: recommendedProducts.length,
        itemBuilder: (context, index) {
          return ProductCard(product: recommendedProducts[index]);
        },
      ),
    );
  }
}

class ProductCard extends StatelessWidget {
  final Product product;

  const ProductCard({super.key, required this.product});

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: () => ProductDetailModal.show(context, product),
      borderRadius: BorderRadius.circular(20.r),
      child: Container(
        width: 154.w,
        margin: EdgeInsets.only(right: 16.w),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Image with Add Button
            Stack(
              children: [
                Container(
                  height: 180.h,
                  width: 154.w,
                  decoration: BoxDecoration(
                    color: const Color(0xFFF1F5F9),
                    borderRadius: BorderRadius.circular(20.r),
                    image: DecorationImage(
                      image: NetworkImage(product.imageUrl),
                      fit: BoxFit.cover,
                    ),
                  ),
                ),
                Positioned(
                  bottom: 12.h,
                  right: 12.w,
                  child: Container(
                    width: 32.w,
                    height: 32.w,
                    decoration: BoxDecoration(
                      color: Theme.of(context).primaryColor,
                      shape: BoxShape.circle,
                      boxShadow: [
                        BoxShadow(
                          color: Theme.of(context).primaryColor.withOpacity(0.3),
                          blurRadius: 8,
                          offset: const Offset(0, 4),
                        ),
                      ],
                    ),
                    child: Icon(
                      Icons.add_rounded,
                      color: Colors.white,
                      size: 20.w,
                    ),
                  ),
                ),
                // "HOT" Badge Example (Static for demo if needed)
                if (product.name.contains('Matcha'))
                  Positioned(
                    top: 12.h,
                    left: 12.w,
                    child: Container(
                      padding: EdgeInsets.symmetric(horizontal: 8.w, vertical: 4.h),
                      decoration: BoxDecoration(
                        color: const Color(0xFFFFB400),
                        borderRadius: BorderRadius.circular(6.r),
                      ),
                      child: Text(
                        'HOT',
                        style: TextStyle(
                          fontSize: 10.sp,
                          fontWeight: FontWeight.bold,
                          color: const Color(0xFF0F172A),
                        ),
                      ),
                    ),
                  ),
              ],
            ),
            SizedBox(height: 12.h), // Keep height for vertical spacing
            Text(
              product.name,
              style: TextStyle(
                fontSize: 14.sp,
                fontWeight: FontWeight.w600,
                color: const Color(0xFF1E293B),
              ),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
            SizedBox(height: 4.h),
            Text(
              'Rp ${product.basePrice ~/ 1000}.000',
              style: TextStyle(
                fontSize: 12.sp,
                color: const Color(0xFF94A3B8),
                fontWeight: FontWeight.w500,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
