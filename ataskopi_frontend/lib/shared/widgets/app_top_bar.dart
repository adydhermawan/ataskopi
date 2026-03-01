import 'package:flutter/material.dart';
import 'package:flutter_screenutil/flutter_screenutil.dart';
import '../../core/theme/app_colors.dart';

/// A reusable top app bar component that provides consistent styling
/// across all screens in the AtasKopi application.
class AppTopBar extends StatelessWidget implements PreferredSizeWidget {
  final String title;
  final Widget? titleWidget;
  final VoidCallback? onBackPressed;
  final List<Widget>? actions;
  final bool showBackButton;
  final bool centerTitle;
  final Color? backgroundColor;

  const AppTopBar({
    super.key,
    required this.title,
    this.titleWidget,
    this.onBackPressed,
    this.actions,
    this.showBackButton = true,
    this.centerTitle = true,
    this.backgroundColor,
  });

  @override
  Size get preferredSize => Size.fromHeight(56.h);

  @override
  Widget build(BuildContext context) {
    return AppBar(
      backgroundColor: backgroundColor ?? Colors.white,
      elevation: 0,
      centerTitle: centerTitle,
      automaticallyImplyLeading: false,
      toolbarHeight: 56.h,
      titleSpacing: 0,
      leadingWidth: 48.w,
      leading: showBackButton
          ? Padding(
              padding: EdgeInsets.only(left: 8.w),
              child: Center(
                child: Material(
                  color: Colors.transparent,
                  child: InkWell(
                    onTap: onBackPressed ?? () => Navigator.pop(context),
                    borderRadius: BorderRadius.circular(50),
                    child: Container(
                      width: 40.w,
                      height: 40.w,
                      alignment: Alignment.center,
                      child: Icon(
                        Icons.chevron_left,
                        size: 24.w,
                        color: AppColors.primary,
                      ),
                    ),
                  ),
                ),
              ),
            )
          : null,
      title: titleWidget ??
          Text(
            title,
            style: TextStyle(
              fontSize: 16.sp,
              fontWeight: FontWeight.w700,
              color: const Color(0xFF0F172A),
              letterSpacing: -0.5,
            ),
          ),
      actions: actions != null
          ? actions!.map((a) => Padding(padding: EdgeInsets.only(right: 8.w), child: a)).toList()
          : null,
      bottom: backgroundColor == Colors.transparent
          ? null
          : PreferredSize(
              preferredSize: Size.fromHeight(1.h),
              child: Container(
                color: const Color(0xFFF1F5F9),
                height: 1.h,
              ),
            ),
    );
  }

  /// Creates a standard action button for the top bar
  static Widget actionButton({
    required IconData icon,
    required VoidCallback onTap,
    Color? iconColor,
    Color? backgroundColor,
    bool showBadge = false,
  }) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(50),
        child: Stack(
          alignment: Alignment.center,
          children: [
            Container(
              width: 40.w,
              height: 40.w,
              alignment: Alignment.center,
              decoration: const BoxDecoration(
                color: Colors.transparent,
                shape: BoxShape.circle,
              ),
              child: Icon(
                icon,
                size: 20.w,
                color: iconColor ?? const Color(0xFF0F172A),
              ),
            ),
            if (showBadge)
              Positioned(
                top: 8.h,
                right: 8.w,
                child: Container(
                  width: 10.w,
                  height: 10.w,
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
    );
  }
}
