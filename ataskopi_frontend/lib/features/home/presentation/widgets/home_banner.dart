import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import 'package:ataskopi_frontend/core/api/api_config.dart';

class HomeBanner extends StatelessWidget {
  final String imageUrl;
  final String title;
  final String tier;
  final int unreadCount;
  final VoidCallback? onTierTap;
  final VoidCallback? onNotificationTap;

  const HomeBanner({
    super.key,
    required this.imageUrl,
    required this.title,
    required this.tier,
    this.unreadCount = 0,
    this.onTierTap,
    this.onNotificationTap,
  });

  @override
  Widget build(BuildContext context) {
    final double statusBarHeight = MediaQuery.of(context).padding.top;
    
    return SizedBox(
      width: 1.sw,
      height: (1.sw * 6 / 5) * 0.7, // Aspect ratio 5:6 reduced to 70% of original height
      child: Stack(
        children: [
          // Background Image
          Positioned.fill(
            child: Image.network(
              ApiConfig.fullImageUrl(imageUrl),
              fit: BoxFit.cover,
              errorBuilder: (context, error, stackTrace) => Container(
                color: const Color(0xFF1E293B),
                child: Center(
                  child: Icon(Icons.coffee_rounded, color: Colors.white.withOpacity(0.2), size: 100.w),
                ),
              ),
            ),
          ),
          // Gradient Overlay (Darker at top and bottom for readability)
          Positioned.fill(
            child: Container(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [
                    Colors.black.withOpacity(0.6),
                    Colors.black.withOpacity(0.1),
                    Colors.black.withOpacity(0.8),
                  ],
                  stops: const [0.0, 0.4, 1.0],
                ),
              ),
            ),
          ),
          // Content
          Padding(
            padding: EdgeInsets.fromLTRB(24.w, statusBarHeight + 12.h, 24.w, 24.h),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    // Member Badge
                    GestureDetector(
                      onTap: onTierTap,
                      child: Container(
                        padding: EdgeInsets.symmetric(horizontal: 16.w, vertical: 10.h),
                        decoration: BoxDecoration(
                          color: Colors.white.withOpacity(0.15),
                          borderRadius: BorderRadius.circular(100),
                          border: Border.all(color: Colors.white.withOpacity(0.3), width: 1.w),
                        ),
                        child: Row(
                          children: [
                            Icon(Icons.workspace_premium_rounded, color: const Color(0xFFFFB400), size: 20.w),
                            SizedBox(width: 10.w),
                            Text(
                              tier.toUpperCase(),
                              style: TextStyle(
                                color: Colors.white,
                                fontSize: 12.sp,
                                fontWeight: FontWeight.bold,
                                letterSpacing: 1.1,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                    // Notification Icon
                    GestureDetector(
                      onTap: onNotificationTap,
                      child: Container(
                        padding: EdgeInsets.all(12.w),
                        decoration: BoxDecoration(
                          color: Colors.white.withOpacity(0.15),
                          shape: BoxShape.circle,
                          border: Border.all(color: Colors.white.withOpacity(0.3), width: 1.w),
                        ),
                        child: Stack(
                          children: [
                            Icon(Icons.notifications_none_rounded, color: Colors.white, size: 24.w),
                            if (unreadCount > 0)
                              Positioned(
                                right: 0,
                                top: 0,
                                child: Container(
                                  width: 11.w,
                                  height: 11.w,
                                  decoration: BoxDecoration(
                                    color: const Color(0xFFEF4444),
                                    shape: BoxShape.circle,
                                    border: Border.all(color: Colors.white, width: 2.w),
                                  ),
                                ),
                              ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
                const Spacer(),
                Center(
                  child: Column(
                    children: [
                      Text(
                        title,
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 28.sp,
                          fontWeight: FontWeight.w800,
                          height: 1.25,
                          shadows: [
                            Shadow(
                              color: Colors.black.withOpacity(0.5),
                              blurRadius: 15,
                              offset: const Offset(0, 4),
                            ),
                          ],
                        ),
                      ),
                      SizedBox(height: 24.h),
                      SizedBox(height: 48.h), // Space for the overlapping outlet selector
                    ],
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
