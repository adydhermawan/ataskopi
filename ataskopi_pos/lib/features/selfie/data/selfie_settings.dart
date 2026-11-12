import 'dart:math' as math;

/// Saved on the phone, because the right values depend on this printer.
class SelfieSettings {
  const SelfieSettings({
    this.rush = false,
    this.handle = '@atas_kopi',
    this.photoHeight = 460,
    this.brightness = 0.05,
  });

  factory SelfieSettings.fromJson(Map<String, dynamic> json) => SelfieSettings(
        rush: json['rush'] as bool? ?? false,
        handle: json['handle'] as String? ?? '@atas_kopi',
        photoHeight: json['photoHeight'] as int? ?? 460,
        brightness: (json['brightness'] as num?)?.toDouble() ?? 0.05,
      );

  /// Rush mode switches selfies off when the outlet is overwhelmed.
  final bool rush;
  /// The Instagram and TikTok account, printed next to their icons.
  final String handle;
  final int photoHeight;
  final double brightness;

  SelfieSettings copyWith({
    bool? rush,
    String? handle,
    int? photoHeight,
    double? brightness,
  }) =>
      SelfieSettings(
        rush: rush ?? this.rush,
        handle: handle ?? this.handle,
        photoHeight: photoHeight ?? this.photoHeight,
        brightness: brightness ?? this.brightness,
      );

  Map<String, dynamic> toJson() => {
        'rush': rush,
        'handle': handle,
        'photoHeight': photoHeight,
        'brightness': brightness,
      };
}

final brightnessLevels = {-0.1: 'Gelap', 0.05: 'Normal', 0.15: 'Terang'};

/// Drafts until the final copy is decided; each one fits two printed lines.
const captions = [
  'Ngopi dulu, overthinking nanti.',
  'Mood hari ini: di atas.',
  'Senyum dulu, kopinya lagi dibuat.',
  'Kopi di tangan, hati aman.',
  'Satu gelas, satu cerita.',
  'Foto dulu biar ada buktinya.',
  'Kafein masuk, semangat naik.',
  'Yang pahit cukup kopinya aja.',
  'Hari ini milik kita, dan kopi.',
  'Bukan kopi biasa, ini kopi atas.',
];

String randomCaption([math.Random? random]) => captions[(random ?? math.Random()).nextInt(captions.length)];
