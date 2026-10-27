import 'dart:math' as math;
import 'package:flutter/material.dart';

const forest = Color(0xFF15803D),
    forestDark = Color(0xFF14532D),
    tomato = Color(0xFFDC2626),
    amber = Color(0xFFD97706);
const page = Color(0xFFF6F8F6),
    border = Color(0xFFE2E8E4),
    ink = Color(0xFF1E293B),
    muted = Color(0xFF64748B);

Color farmText(BuildContext context) => Theme.of(context).colorScheme.onSurface;
Color farmMuted(BuildContext context) =>
    Theme.of(context).colorScheme.onSurfaceVariant;
Color farmSurface(BuildContext context) =>
    Theme.of(context).brightness == Brightness.dark
        ? const Color(0xFF1B2B23)
        : page;

class FarmCard extends StatelessWidget {
  const FarmCard(
      {super.key,
      required this.child,
      this.padding = const EdgeInsets.all(18),
      this.margin = const EdgeInsets.only(bottom: 16)});
  final Widget child;
  final EdgeInsets padding, margin;
  @override
  Widget build(BuildContext context) => Container(
      width: double.infinity,
      margin: margin,
      padding: padding,
      decoration: BoxDecoration(
          color: Theme.of(context).cardColor,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: Theme.of(context).dividerColor),
          boxShadow: const [
            BoxShadow(
                color: Color(0x0B000000), blurRadius: 12, offset: Offset(0, 3))
          ]),
      child: child);
}

class Heading extends StatelessWidget {
  const Heading(this.title, this.subtitle,
      {super.key, this.icon = Icons.eco_outlined, this.color = forest});
  final String title, subtitle;
  final IconData icon;
  final Color color;
  @override
  Widget build(BuildContext context) => Row(children: [
        Container(
            width: 42,
            height: 42,
            decoration: BoxDecoration(
                color: color.withValues(alpha: .10),
                borderRadius: BorderRadius.circular(11),
                border: Border.all(color: color.withValues(alpha: .22))),
            child: Icon(icon, color: color)),
        const SizedBox(width: 12),
        Expanded(
            child:
                Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(title,
              style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w800,
                  color: Theme.of(context).colorScheme.onSurface)),
          Text(subtitle,
              style: TextStyle(
                  fontSize: 12,
                  color: Theme.of(context).colorScheme.onSurfaceVariant))
        ]))
      ]);
}

class PrimaryButton extends StatelessWidget {
  const PrimaryButton(
      {super.key,
      required this.label,
      required this.onPressed,
      this.icon = Icons.check,
      this.loading = false});
  final String label;
  final VoidCallback? onPressed;
  final IconData icon;
  final bool loading;
  @override
  Widget build(BuildContext context) => FilledButton.icon(
      style: FilledButton.styleFrom(
          backgroundColor: forest,
          foregroundColor: Colors.white,
          padding: const EdgeInsets.symmetric(horizontal: 17, vertical: 13)),
      onPressed: loading ? null : onPressed,
      icon: loading
          ? const SizedBox(
              width: 17,
              height: 17,
              child: CircularProgressIndicator(
                  strokeWidth: 2, color: Colors.white))
          : Icon(icon, size: 18),
      label: Text(label, style: const TextStyle(fontWeight: FontWeight.w700)));
}

class StageCard extends StatelessWidget {
  const StageCard(
      {super.key,
      required this.label,
      required this.title,
      required this.description,
      required this.value,
      required this.color,
      required this.chip});
  final String label, title, description, chip;
  final dynamic value;
  final Color color;
  @override
  Widget build(BuildContext context) => FarmCard(
      padding: const EdgeInsets.all(16),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          Expanded(
              child: Text(chip.toUpperCase(),
                  style: TextStyle(
                      color: color,
                      fontSize: 10,
                      fontWeight: FontWeight.w800,
                      letterSpacing: .6))),
          Icon(Icons.circle, color: color, size: 11)
        ]),
        const SizedBox(height: 10),
        Text('$value',
            style: TextStyle(
                color: color,
                fontSize: 38,
                height: 1,
                fontWeight: FontWeight.w800)),
        Text(title,
            style: TextStyle(
                fontSize: 15,
                fontWeight: FontWeight.w700,
                color: Theme.of(context).colorScheme.onSurface)),
        const SizedBox(height: 6),
        Text(description,
            style: TextStyle(
                fontSize: 12,
                height: 1.45,
                color: Theme.of(context).colorScheme.onSurfaceVariant))
      ]));
}

class Gauge extends StatelessWidget {
  const Gauge({super.key, required this.value, this.size = 270});
  final double value, size;
  @override
  Widget build(BuildContext context) => SizedBox(
      width: size,
      height: size * .72,
      child: CustomPaint(
          painter: GaugePainter(
              value,
              Theme.of(context).brightness == Brightness.dark
                  ? Colors.white
                  : ink),
          child: Center(
              child: Padding(
                  padding: EdgeInsets.only(top: size * .22),
                  child: Column(mainAxisSize: MainAxisSize.min, children: [
                    Text('${value.toStringAsFixed(0)}%',
                        style: TextStyle(
                            fontSize: 34,
                            fontWeight: FontWeight.w800,
                            color: Theme.of(context).colorScheme.onSurface)),
                    Text(
                        value >= 85
                            ? 'READY TO HARVEST'
                            : value >= 60
                                ? 'TURNING / ALMOST READY'
                                : value >= 30
                                    ? 'STILL DEVELOPING'
                                    : 'EARLY GREEN',
                        textAlign: TextAlign.center,
                        style: TextStyle(
                            color: value >= 85
                                ? forest
                                : value >= 60
                                    ? const Color(0xFF65A30D)
                                    : amber,
                            fontSize: 9,
                            fontWeight: FontWeight.bold,
                            letterSpacing: .5))
                  ])))));
}

class GaugePainter extends CustomPainter {
  GaugePainter(this.value, this.needle);
  final double value;
  final Color needle;
  @override
  void paint(Canvas canvas, Size s) {
    final center = Offset(s.width / 2, s.height * .72);
    final radius = s.width * .36;
    final rect = Rect.fromCircle(center: center, radius: radius);
    final segments = [
      const Color(0xFFFECACA),
      const Color(0xFFFEF3C7),
      const Color(0xFFECFCCB),
      const Color(0xFFBBF7D0)
    ];
    final p = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = s.width * .065
      ..strokeCap = StrokeCap.butt;
    for (var i = 0; i < 4; i++) {
      p.color = segments[i];
      canvas.drawArc(
          rect, math.pi + i * math.pi / 4, math.pi / 4 - .025, false, p);
    }
    p.color = Colors.black12;
    p.strokeWidth = 2;
    canvas.drawArc(rect, math.pi, math.pi, false, p);
    if (value > 0) {
      p.color = value >= 85
          ? forest
          : value >= 60
              ? const Color(0xFF65A30D)
              : value >= 30
                  ? amber
                  : tomato;
      p.strokeWidth = s.width * .026;
      p.strokeCap = StrokeCap.round;
      canvas.drawArc(
          rect, math.pi, math.pi * value.clamp(0, 100) / 100, false, p);
    }
    final a = math.pi + math.pi * value.clamp(0, 100) / 100;
    final tip = center + Offset(math.cos(a), math.sin(a)) * radius * .8;
    canvas.drawLine(
        center,
        tip,
        Paint()
          ..color = needle
          ..strokeWidth = 3
          ..strokeCap = StrokeCap.round);
    canvas.drawCircle(center, 6, Paint()..color = needle);
    canvas.drawCircle(center, 2.5, Paint()..color = Colors.white);
  }

  @override
  bool shouldRepaint(covariant GaugePainter old) =>
      old.value != value || old.needle != needle;
}

class ReadinessChart extends StatelessWidget {
  const ReadinessChart({super.key, required this.rows});
  final List<Map<String, dynamic>> rows;
  @override
  Widget build(BuildContext context) => SizedBox(
      height: 210,
      child: CustomPaint(
          size: Size.infinite,
          painter: _TrendPainter(
              rows,
              Theme.of(context).brightness == Brightness.dark
                  ? Colors.white
                  : muted)));
}

class _TrendPainter extends CustomPainter {
  _TrendPainter(this.rows, this.textColor);
  final List<Map<String, dynamic>> rows;
  final Color textColor;
  @override
  void paint(Canvas canvas, Size s) {
    if (rows.isEmpty) return;
    final data = rows.reversed.toList();
    const l = 34.0, r = 12.0, t = 12.0, b = 28.0;
    final w = s.width - l - r, h = s.height - t - b;
    final grid = Paint()
      ..color = const Color(0xFFE6ECE7)
      ..strokeWidth = 1;
    final tp = TextPainter(textDirection: TextDirection.ltr);
    for (var i = 0; i <= 4; i++) {
      final y = t + h * i / 4;
      canvas.drawLine(Offset(l, y), Offset(l + w, y), grid);
      tp.text = TextSpan(
          text: '${100 - i * 25}%',
          style: TextStyle(fontSize: 9, color: textColor));
      tp.layout();
      tp.paint(canvas, Offset(0, y - 6));
    }
    Offset pt(int i, double val) => Offset(
        l + (data.length == 1 ? w / 2 : i * w / (data.length - 1)),
        t + h * (1 - (double.tryParse('$val') ?? 0).clamp(0, 100) / 100));
    final line = Path();
    final ripe = Path();
    for (var i = 0; i < data.length; i++) {
      final a = pt(i, data[i]['readiness'] ?? 0),
          bpt = pt(i, data[i]['readiness_spec'] ?? 0);
      if (i == 0) {
        line.moveTo(a.dx, a.dy);
        ripe.moveTo(bpt.dx, bpt.dy);
      } else {
        line.lineTo(a.dx, a.dy);
        ripe.lineTo(bpt.dx, bpt.dy);
      }
    }
    canvas.drawPath(
        line,
        Paint()
          ..color = const Color(0xFF10B981)
          ..style = PaintingStyle.stroke
          ..strokeWidth = 3);
    canvas.drawPath(
        ripe,
        Paint()
          ..color = tomato.withValues(alpha: .8)
          ..style = PaintingStyle.stroke
          ..strokeWidth = 2);
    for (var i = 0; i < data.length; i++) {
      final p = pt(i, data[i]['readiness'] ?? 0);
      canvas.drawCircle(p, 4, Paint()..color = Colors.white);
      canvas.drawCircle(
          p,
          4,
          Paint()
            ..color = const Color(0xFF10B981)
            ..style = PaintingStyle.stroke
            ..strokeWidth = 2);
      tp.text = TextSpan(
          text: '#${data[i]['id']}',
          style: TextStyle(fontSize: 9, color: textColor));
      tp.layout();
      tp.paint(canvas, Offset(p.dx - tp.width / 2, s.height - 15));
    }
  }

  @override
  bool shouldRepaint(covariant _TrendPainter old) => old.rows != rows;
}

class CountBars extends StatelessWidget {
  const CountBars({super.key, required this.rows});
  final List<Map<String, dynamic>> rows;
  @override
  Widget build(BuildContext c) => SizedBox(
      height: 210,
      child: CustomPaint(size: Size.infinite, painter: _BarsPainter(rows)));
}

class _BarsPainter extends CustomPainter {
  _BarsPainter(this.rows);
  final List<Map<String, dynamic>> rows;
  @override
  void paint(Canvas canvas, Size s) {
    if (rows.isEmpty) return;
    final data = rows.reversed.take(12).toList();
    const l = 30.0, t = 12.0, b = 28.0, r = 8.0;
    final h = s.height - t - b, w = s.width - l - r;
    final maxVal = data
        .map((d) => (d['total'] as num? ?? 0).toDouble())
        .fold<double>(10, math.max);
    final axis = (maxVal / 5).ceil() * 5;
    final slot = w / data.length, bw = math.min(32, slot * .65).toDouble();
    final colors = [
      const Color(0xFF84CC16),
      const Color(0xFFF59E0B),
      const Color(0xFFEF4444)
    ];
    final p = Paint();
    for (var k = 0; k < 3; k++) {
      final y = t + h * k / 2;
      canvas.drawLine(Offset(l, y), Offset(l + w, y),
          Paint()..color = const Color(0xFFE6ECE7));
      final tp = TextPainter(
          text: TextSpan(
              text: '${(axis - axis * k / 2).round()}',
              style: const TextStyle(fontSize: 9, color: muted)),
          textDirection: TextDirection.ltr)
        ..layout();
      tp.paint(canvas, Offset(0, y - 6));
    }
    for (var i = 0; i < data.length; i++) {
      final counts = Map<String, dynamic>.from(data[i]['counts'] ?? {});
      double bottom = t + h;
      for (final key in ['unripe', 'semiripe', 'ripe']) {
        final n = (counts[key] as num? ?? 0).toDouble(), bh = n / axis * h;
        if (bh > 0) {
          p.color = colors[['unripe', 'semiripe', 'ripe'].indexOf(key)];
          canvas.drawRect(
              Rect.fromLTWH((l + i * slot + (slot - bw) / 2).toDouble(),
                  bottom - bh, bw, bh),
              p);
          bottom -= bh;
        }
      }
      final tp = TextPainter(
          text: TextSpan(
              text: '#${data[i]['id']}',
              style: const TextStyle(fontSize: 9, color: muted)),
          textDirection: TextDirection.ltr)
        ..layout();
      tp.paint(
          canvas, Offset(l + i * slot + (slot - tp.width) / 2, s.height - 15));
    }
  }

  @override
  bool shouldRepaint(covariant _BarsPainter old) => old.rows != rows;
}
