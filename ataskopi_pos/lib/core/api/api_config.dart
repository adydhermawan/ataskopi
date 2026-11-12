class ApiConfig {
  /// Set per build with --dart-define=API_BASE_URL=https://...
  /// The default reaches the host machine from the Android emulator.
  static const baseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://10.0.2.2:3000',
  );

  static const requestTimeout = Duration(seconds: 10);
}
