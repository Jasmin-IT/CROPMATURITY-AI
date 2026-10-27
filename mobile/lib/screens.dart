import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'dart:typed_data';
import 'package:camera/camera.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:share_plus/share_plus.dart';
import 'api.dart';
import 'ui.dart';

class InspectScreen extends StatefulWidget {
  const InspectScreen({super.key, this.onComplete});
  final VoidCallback? onComplete;
  @override
  State<InspectScreen> createState() => _InspectScreenState();
}

class _InspectScreenState extends State<InspectScreen> {
  final picker = ImagePicker();
  XFile? image;
  Uint8List? imageBytes;
  Map<String, dynamic>? result, advice;
  bool busy = false, aiBusy = false, save = true, sideBySide = false;
  String? error;
  double slider = .5;
  final checked = <int>{};
  Future<void> inspect(ImageSource source) async {
    setState(() {
      busy = true;
      error = null;
    });
    try {
      final f = await picker.pickImage(source: source, imageQuality: 92);
      if (f == null) return;
      final bytes = await f.readAsBytes();
      if (!mounted) return;
      setState(() {
        image = f;
        imageBytes = bytes;
        result = null;
        advice = null;
        checked.clear();
      });
      final r = await FarmApi.predict(f, save: save);
      if (!mounted) return;
      setState(() => result = r);
      widget.onComplete?.call();
      if ((r['total'] ?? 0) > 0) await loadAdvice(r['id'] as int?);
    } catch (e) {
      if (mounted) setState(() => error = '$e'.replaceFirst('Exception: ', ''));
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  Future<void> loadAdvice(int? id) async {
    setState(() => aiBusy = true);
    try {
      final a = await FarmApi.aiAnalysis(id);
      if (mounted) setState(() => advice = a);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text('Advice unavailable: $e')));
      }
    } finally {
      if (mounted) setState(() => aiBusy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final r = result;
    final counts = Map<String, dynamic>.from(r?['counts'] ?? {});
    final pc = Map<String, dynamic>.from(r?['percentages'] ?? {});
    final score = ((r?['readiness'] ?? 0) as num).toDouble();
    final total = r?['total'] ?? 0;
    final annotated = r?['annotated_jpg_base64'] as String?;
    return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      FarmCard(
          child:
              Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        const Heading('Inspect Your Crops',
            'Choose a photo of your tomato vines or take a photo with your camera',
            icon: Icons.photo_camera_outlined),
        const SizedBox(height: 14),
        SwitchListTile(
            contentPadding: EdgeInsets.zero,
            dense: true,
            title: const Text('Save to Field Records',
                style: TextStyle(fontSize: 13)),
            value: save,
            onChanged: (v) => setState(() => save = v)),
        Wrap(spacing: 8, runSpacing: 8, children: [
          OutlinedButton.icon(
              onPressed: busy ? null : () => inspect(ImageSource.gallery),
              icon: const Icon(Icons.upload_file),
              label: const Text('Choose Photo')),
          FilledButton.icon(
              style: FilledButton.styleFrom(backgroundColor: forest),
              onPressed: busy ? null : () => inspect(ImageSource.camera),
              icon: const Icon(Icons.camera_alt_outlined),
              label: const Text('Take Photo'))
        ]),
        if (image != null) ...[
          const SizedBox(height: 13),
          ClipRRect(
              borderRadius: BorderRadius.circular(14),
              child: Image.memory(imageBytes!,
                  height: 210, width: double.infinity, fit: BoxFit.cover))
        ],
        if (busy)
          const Padding(
              padding: EdgeInsets.all(20),
              child:
                  Row(mainAxisAlignment: MainAxisAlignment.center, children: [
                SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(strokeWidth: 2)),
                SizedBox(width: 12),
                Text('Scanning crop picture…',
                    style:
                        TextStyle(color: forest, fontWeight: FontWeight.w700))
              ])),
        if (error != null)
          Container(
              margin: const EdgeInsets.only(top: 12),
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                  color: const Color(0xFFFEF2F2),
                  borderRadius: BorderRadius.circular(12)),
              child: Text(error!, style: const TextStyle(color: tomato)))
      ])),
      if (r != null) ...[
        Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Expanded(
              child: FarmCard(
                  child: Column(children: [
            const Text('FIELD HARVEST VERDICT',
                style: TextStyle(
                    color: muted,
                    fontWeight: FontWeight.w800,
                    fontSize: 11,
                    letterSpacing: .7)),
            const SizedBox(height: 6),
            Gauge(value: score, size: 250),
            Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 15, vertical: 8),
                decoration: BoxDecoration(
                    color: (score >= 85
                            ? forest
                            : score >= 60
                                ? amber
                                : muted)
                        .withValues(alpha: .1),
                    borderRadius: BorderRadius.circular(24)),
                child: Text(
                    total == 0
                        ? 'No Tomatoes Found'
                        : score >= 85
                            ? 'Harvest Today'
                            : score >= 60
                                ? 'Almost Ready (2–3 Days)'
                                : 'Growing (Wait & Monitor)',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                        color: score >= 85
                            ? forest
                            : score >= 60
                                ? amber
                                : muted,
                        fontSize: 11,
                        fontWeight: FontWeight.w800))),
            const SizedBox(height: 10),
            Text('${r['status'] ?? ''}',
                textAlign: TextAlign.center,
                style: const TextStyle(color: muted, fontSize: 12)),
            if ((counts['ripe'] ?? 0) > 0) ...[
              const Divider(height: 22),
              Text(
                  'Estimated pick: ~${(((counts['ripe'] ?? 0) as num) * .15).toStringAsFixed(1)} kg',
                  style: const TextStyle(fontWeight: FontWeight.bold)),
              Text('Total found: $total fruit',
                  style: const TextStyle(
                      color: forest, fontWeight: FontWeight.bold))
            ]
          ]))),
        ]),
        StageCard(
            label: 'Ripe',
            title: 'Ripe & Ready',
            description:
                '${pc['ripe'] ?? 0}% of crop · Full red color and firm skin. Harvest today for top flavor and freshness.',
            value: counts['ripe'] ?? 0,
            color: tomato,
            chip: 'Pick Today'),
        StageCard(
            label: 'Turning',
            title: 'Turning / Breaker',
            description:
                '${pc['semiripe'] ?? 0}% of crop · Showing yellow-orange blush. Leave on vine 48–72 hours to ripen fully.',
            value: counts['semiripe'] ?? 0,
            color: amber,
            chip: 'Pick in 2–3 Days'),
        StageCard(
            label: 'Green',
            title: 'Green & Developing',
            description:
                '${pc['unripe'] ?? 0}% of crop · Immature fruit still forming sugars. Needs 7–12 more days on the plant.',
            value: counts['unripe'] ?? 0,
            color: forest,
            chip: 'Leave on Vine'),
        _imageComparison(
            imageBytes!,
            annotated,
            sideBySide,
            (v) => setState(() => sideBySide = v),
            (v) => setState(() => slider = v),
            slider),
        if (total > 0) _actionPlan(counts),
      ]
    ]);
  }

  Widget _actionPlan(Map<String, dynamic> counts) => FarmCard(
          child:
              Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        const Heading("Today's Field Action Plan",
            'Actionable picking instructions and storage guidance',
            icon: Icons.check_circle_outline, color: amber),
        const SizedBox(height: 12),
        Row(children: [
          const Expanded(
              child: Text('Picking Checklist',
                  style: TextStyle(fontWeight: FontWeight.w800, fontSize: 15))),
          TextButton.icon(
              onPressed:
                  aiBusy ? null : () => loadAdvice(result?['id'] as int?),
              icon: aiBusy
                  ? const SizedBox(
                      width: 14,
                      height: 14,
                      child: CircularProgressIndicator(strokeWidth: 2))
                  : const Icon(Icons.refresh, size: 17),
              label: Text(aiBusy ? 'Updating…' : 'Refresh Plan'))
        ]),
        ...[
          (
            'Harvest ${counts['ripe'] ?? 0} ripe tomatoes',
            'Snap gently keeping green calyx cap attached.'
          ),
          (
            'Leave ${counts['semiripe'] ?? 0} turning tomatoes on vine',
            'Check back in 2 to 3 days for maximum sugars.'
          ),
          (
            'Store harvested tomatoes at 18°C (65°F)',
            'Place stem-side down; do not refrigerate.'
          )
        ].indexed.map((x) {
          final i = x.$1;
          final task = x.$2;
          final done = checked.contains(i);
          return InkWell(
              onTap: () =>
                  setState(() => done ? checked.remove(i) : checked.add(i)),
              child: Container(
                  margin: const EdgeInsets.only(bottom: 8),
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                      color: done ? forest.withValues(alpha: .07) : page,
                      borderRadius: BorderRadius.circular(13),
                      border: Border.all(color: done ? forest : border)),
                  child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Icon(
                            done
                                ? Icons.check_box
                                : Icons.check_box_outline_blank,
                            color: forest),
                        const SizedBox(width: 10),
                        Expanded(
                            child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                              Text(task.$1,
                                  style: TextStyle(
                                      fontWeight: FontWeight.w700,
                                      decoration: done
                                          ? TextDecoration.lineThrough
                                          : null)),
                              Text(task.$2,
                                  style: const TextStyle(
                                      color: muted, fontSize: 12))
                            ]))
                      ])));
        }),
        const SizedBox(height: 8),
        const Text('Harvest Guidelines',
            style: TextStyle(fontWeight: FontWeight.w800, fontSize: 15)),
        const SizedBox(height: 8),
        if (advice != null) ...[
          const Text('Crop Condition:',
              style: TextStyle(color: forest, fontWeight: FontWeight.bold)),
          Text('${advice!['analysis'] ?? ''}'),
          const SizedBox(height: 10),
          const Text('Recommended Next Steps:',
              style: TextStyle(color: amber, fontWeight: FontWeight.bold)),
          Text('${advice!['recommendation'] ?? ''}')
        ] else
          const Text('Formulating agronomic advice…',
              style: TextStyle(color: muted))
      ]));
}

Widget _imageComparison(Uint8List original, String? b64, bool sideBySide,
    ValueChanged<bool> onMode, ValueChanged<double> onSlider, double slider) {
  final marked = b64 == null ? null : base64Decode(b64);
  return FarmCard(
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
    const Heading('Visual Crop Inspection',
        'Compare the original photo with identified tomatoes',
        icon: Icons.visibility_outlined),
    const SizedBox(height: 10),
    SegmentedButton<bool>(segments: const [
      ButtonSegment(
          value: false,
          label: Text('Slide Comparison'),
          icon: Icon(Icons.tune)),
      ButtonSegment(
          value: true, label: Text('Side-by-Side'), icon: Icon(Icons.compare))
    ], selected: {
      sideBySide
    }, onSelectionChanged: (s) => onMode(s.first)),
    const SizedBox(height: 12),
    if (sideBySide)
      Column(children: [
        _LabeledImage(
            label: 'Original Photo',
            child: Image.memory(original,
                height: 210, fit: BoxFit.contain)),
        const SizedBox(height: 10),
        _LabeledImage(
            label: 'Marked Tomatoes',
            child: marked == null
                ? const SizedBox(height: 120)
                : Image.memory(marked, height: 210, fit: BoxFit.contain)),
      ])
    else
      GestureDetector(
        onHorizontalDragUpdate: (d) =>
            onSlider((slider + d.delta.dx / 300).clamp(.04, .96).toDouble()),
        child: LayoutBuilder(
            builder: (c, box) => ClipRRect(
                  borderRadius: BorderRadius.circular(14),
                  child: SizedBox(
                      height: 260,
                      width: double.infinity,
                      child: Stack(fit: StackFit.expand, children: [
                        Container(
                            color: const Color(0xFF050A08),
                            child: marked == null
                                ? Image.memory(original,
                                    fit: BoxFit.contain)
                                : Image.memory(marked, fit: BoxFit.contain)),
                        ClipRect(
                            child: Align(
                                alignment: Alignment.centerLeft,
                                widthFactor: slider,
                                child: Container(
                                    color: const Color(0xFF050A08),
                                    child: Image.memory(original,
                                        width: box.maxWidth,
                                        height: 260,
                                        fit: BoxFit.contain)))),
                        Positioned(
                            left: slider * box.maxWidth - 1.5,
                            top: 0,
                            bottom: 0,
                            child: Container(width: 3, color: Colors.white)),
                        Positioned(
                            left: (slider * box.maxWidth - 22)
                                .clamp(0, box.maxWidth - 44)
                                .toDouble(),
                            top: 110,
                            child: const CircleAvatar(
                                radius: 22,
                                backgroundColor: Colors.white,
                                child: Icon(Icons.swap_horiz, color: ink))),
                        const Positioned(
                            left: 10, top: 10, child: _Tag('Original')),
                        const Positioned(
                            right: 10, top: 10, child: _Tag('Annotated')),
                      ])),
                )),
      ),
    const SizedBox(height: 8),
    const Center(
        child: Text('Drag the handle to compare the detected fruit',
            style: TextStyle(color: muted, fontSize: 11))),
  ]));
}

class _LabeledImage extends StatelessWidget {
  const _LabeledImage({required this.label, required this.child});
  final String label;
  final Widget child;
  @override
  Widget build(BuildContext c) => Container(
      width: double.infinity,
      decoration: BoxDecoration(
          color: Colors.black, borderRadius: BorderRadius.circular(12)),
      child: Column(children: [
        Container(
            width: double.infinity,
            padding: const EdgeInsets.all(8),
            child: Text(label,
                style: const TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.bold,
                    fontSize: 12))),
        child
      ]));
}

class _Tag extends StatelessWidget {
  const _Tag(this.text);
  final String text;
  @override
  Widget build(BuildContext c) => Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration:
          BoxDecoration(color: forest, borderRadius: BorderRadius.circular(18)),
      child: Text(text,
          style: const TextStyle(
              color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold)));
}

class LiveScreen extends StatefulWidget {
  const LiveScreen({super.key, this.onSnapshot});
  final VoidCallback? onSnapshot;
  @override
  State<LiveScreen> createState() => _LiveScreenState();
}

class _LiveScreenState extends State<LiveScreen> {
  CameraController? camera;
  Timer? timer;
  bool running = false, capturing = false, saving = false;
  String? error, success;
  Map<String, dynamic>? reading;
  Uint8List? annotated;
  Future<void> start() async {
    try {
      final cameras = await availableCameras();
      final chosen = cameras.firstWhere(
          (c) => c.lensDirection == CameraLensDirection.back,
          orElse: () => cameras.first);
      final c =
          CameraController(chosen, ResolutionPreset.medium, enableAudio: false);
      await c.initialize();
      if (!mounted) {
        await c.dispose();
        return;
      }
      setState(() {
        camera = c;
        running = true;
        error = null;
        success = null;
      });
      _schedule();
    } catch (e) {
      if (mounted) setState(() => error = 'Cannot access camera: $e');
    }
  }

  void _schedule() {
    timer?.cancel();
    timer = Timer.periodic(const Duration(milliseconds: 1800), (_) => _scan());
  }

  Future<void> _scan() async {
    if (!running ||
        capturing ||
        camera == null ||
        !camera!.value.isInitialized) {
      return;
    }
    capturing = true;
    XFile? frame;
    try {
      frame = await camera!.takePicture();
      final value = await FarmApi.liveFrame(frame);
      if (!mounted || !running) return;
      setState(() {
        reading = value;
        final b = value['annotated_jpg_base64'];
        annotated = b is String ? base64Decode(b) : null;
      });
    } catch (e) {
      if (mounted) setState(() => error = 'Live frame dropped: $e');
    } finally {
      if (frame != null) {
        if (!kIsWeb) {
          try {
            await File(frame.path).delete();
          } catch (_) {}
        }
      }
      capturing = false;
    }
  }

  Future<void> stop() async {
    timer?.cancel();
    timer = null;
    final c = camera;
    setState(() {
      running = false;
      camera = null;
    });
    if (c != null) await c.dispose();
  }

  Future<void> saveSnapshot() async {
    if (reading == null) return;
    setState(() => saving = true);
    try {
      final id = await FarmApi.saveLive(reading!);
      if (!mounted) return;
      setState(() => success = 'Saved to your field records as #$id!');
      widget.onSnapshot?.call();
    } catch (e) {
      setState(() => error = 'Save failed: $e');
    } finally {
      if (mounted) setState(() => saving = false);
    }
  }

  @override
  void dispose() {
    timer?.cancel();
    camera?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => FarmCard(
          child:
              Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        const Heading('Live Field Camera Scanner',
            'Point your camera at tomato plants for instant ripeness feedback',
            icon: Icons.videocam_outlined),
        const SizedBox(height: 12),
        PrimaryButton(
            label: running ? 'Stop Camera' : 'Start Camera Scanner',
            icon: running ? Icons.stop : Icons.play_arrow,
            onPressed: running ? stop : start),
        if (error != null)
          Padding(
              padding: const EdgeInsets.only(top: 10),
              child: Text(error!, style: const TextStyle(color: tomato))),
        const SizedBox(height: 12),
        Container(
            width: double.infinity,
            height: 260,
            decoration: BoxDecoration(
                color: Colors.black, borderRadius: BorderRadius.circular(18)),
            clipBehavior: Clip.antiAlias,
            child: running && camera != null && camera!.value.isInitialized
                ? Stack(fit: StackFit.expand, children: [
                    CameraPreview(camera!),
                    if (annotated != null)
                      Image.memory(annotated!, fit: BoxFit.contain),
                    const Positioned(
                        left: 10, top: 10, child: _Tag('LIVE SCAN'))
                  ])
                : Center(
                    child: Column(mainAxisSize: MainAxisSize.min, children: [
                    const Icon(Icons.camera_alt_outlined,
                        size: 45, color: Colors.white54),
                    const SizedBox(height: 8),
                    const Text('Camera is currently turned off',
                        style: TextStyle(
                            color: Colors.white, fontWeight: FontWeight.bold)),
                    Text('Tap “Start Camera Scanner” to scan tomato vines',
                        style: TextStyle(
                            color: Colors.white.withValues(alpha: .7),
                            fontSize: 11))
                  ]))),
        const SizedBox(height: 12),
        _liveReading(reading),
        if (reading != null && (reading!['total'] ?? 0) > 0) ...[
          const SizedBox(height: 10),
          SizedBox(
              width: double.infinity,
              child: FilledButton.icon(
                  onPressed: saving ? null : saveSnapshot,
                  icon: saving
                      ? const SizedBox(
                          width: 16,
                          height: 16,
                          child: CircularProgressIndicator(
                              strokeWidth: 2, color: Colors.white))
                      : const Icon(Icons.save_outlined),
                  label: const Text('Save This View to Records'))),
          if (success != null)
            Text(success!, style: const TextStyle(color: forest))
        ]
      ]));
}

Widget _liveReading(Map<String, dynamic>? data) {
  if (data == null) {
    return const Padding(
        padding: EdgeInsets.all(16),
        child: Center(
            child: Text('Start the camera to see live tomato counts.',
                style: TextStyle(color: muted))));
  }
  final counts = Map<String, dynamic>.from(data['counts'] ?? {}),
      pct = Map<String, dynamic>.from(data['percentages'] ?? {});
  return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
    const Text('Live Plant Reading',
        style: TextStyle(fontWeight: FontWeight.w800, fontSize: 17)),
    Container(
        width: double.infinity,
        margin: const EdgeInsets.symmetric(vertical: 12),
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
            color: const Color(0xFFF0FDF4),
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: const Color(0xFFBBF7D0))),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          const Text('FIELD RIPENESS',
              style: TextStyle(
                  fontSize: 10, color: muted, fontWeight: FontWeight.bold)),
          Text('${data['readiness']}% Ready',
              style: const TextStyle(
                  fontSize: 28, color: forest, fontWeight: FontWeight.w800)),
          Text('${data['status'] ?? ''}')
        ])),
    for (final stage in [
      ('Ripe (Pick Now)', 'ripe', tomato),
      ('Turning (Ready Soon)', 'semiripe', amber),
      ('Green (Growing)', 'unripe', forest)
    ])
      Padding(
          padding: const EdgeInsets.only(bottom: 11),
          child: Column(children: [
            Row(children: [
              Expanded(
                  child: Text('${stage.$1}  ${counts[stage.$2] ?? 0}',
                      style: TextStyle(
                          color: stage.$3,
                          fontWeight: FontWeight.w700,
                          fontSize: 12))),
              Text('${pct[stage.$2] ?? 0}%',
                  style: const TextStyle(fontWeight: FontWeight.bold))
            ]),
            const SizedBox(height: 5),
            ClipRRect(
                borderRadius: BorderRadius.circular(5),
                child: LinearProgressIndicator(
                    value: (((pct[stage.$2] ?? 0) as num).toDouble() / 100)
                        .clamp(0, 1),
                    minHeight: 7,
                    backgroundColor: border,
                    color: stage.$3))
          ]))
  ]);
}

class HistoryScreen extends StatefulWidget {
  const HistoryScreen({super.key, required this.onAsk});
  final ValueChanged<int?> onAsk;
  @override
  State<HistoryScreen> createState() => _HistoryScreenState();
}

class _HistoryScreenState extends State<HistoryScreen> {
  List<Map<String, dynamic>> rows = [];
  bool loading = true, reportBusy = false;
  String query = '';
  String? report;
  final search = TextEditingController();
  @override
  void initState() {
    super.initState();
    load();
  }

  Future<void> load() async {
    setState(() => loading = true);
    try {
      final r = await FarmApi.history();
      if (mounted) setState(() => rows = r);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text('History load error: $e')));
      }
    } finally {
      if (mounted) setState(() => loading = false);
    }
  }

  Future<bool> confirm(String title, String body) async =>
      await showDialog<bool>(
          context: context,
          builder: (c) =>
              AlertDialog(title: Text(title), content: Text(body), actions: [
                TextButton(
                    onPressed: () => Navigator.pop(c, false),
                    child: const Text('Cancel')),
                FilledButton(
                    style: FilledButton.styleFrom(backgroundColor: tomato),
                    onPressed: () => Navigator.pop(c, true),
                    child: const Text('Delete'))
              ])) ??
      false;
  Future<void> remove(int id) async {
    if (!await confirm('Delete harvest record #$id?',
        'This record will be permanently removed.')) {
      return;
    }
    try {
      await FarmApi.deleteHistory(id);
      setState(() => rows.removeWhere((x) => x['id'] == id));
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text('Delete failed: $e')));
      }
    }
  }

  Future<void> clear() async {
    if (!await confirm('Delete all past harvest records?',
        'All saved inspection records and associated AI analysis will be deleted.')) {
      return;
    }
    try {
      await FarmApi.clearHistory();
      setState(() {
        rows.clear();
        report = null;
      });
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text('Clear failed: $e')));
      }
    }
  }

  Future<void> makeReport() async {
    if (rows.isEmpty) return;
    setState(() => reportBusy = true);
    try {
      final r = await FarmApi.dailyReport(rows.first['id'] as int);
      setState(() => report = '${r['report'] ?? ''}');
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text('Report failed: $e')));
      }
    } finally {
      if (mounted) setState(() => reportBusy = false);
    }
  }

  Future<void> shareReport() async {
    if (report == null) return;
    final day = DateTime.now().toIso8601String().substring(0, 10);
    final file = XFile.fromData(
      Uint8List.fromList(utf8.encode(report!)),
      mimeType: 'text/plain',
      name: 'farm_harvest_summary_$day.txt',
    );
    await Share.shareXFiles([file], subject: 'Farm Harvest Summary');
  }

  @override
  void dispose() {
    search.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final latest = rows.isEmpty ? null : rows.first,
        prev = rows.length < 2 ? null : rows[1];
    final delta = latest == null || prev == null
        ? null
        : ((latest['readiness'] as num) - (prev['readiness'] as num));
    final filtered = rows
        .where((r) =>
            '${r['id']}'.contains(query.toLowerCase()) ||
            '${r['source'] ?? ''}'.toLowerCase().contains(query.toLowerCase()))
        .toList();
    return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      FarmCard(
          child:
              Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        const Heading('Harvest Records & History',
            'Review past crop checks and watch your field ripen over time',
            icon: Icons.history),
        const SizedBox(height: 12),
        Wrap(spacing: 8, children: [
          OutlinedButton.icon(
              onPressed: loading ? null : load,
              icon: const Icon(Icons.refresh),
              label: const Text('Refresh')),
          if (rows.isNotEmpty)
            OutlinedButton.icon(
                style: OutlinedButton.styleFrom(foregroundColor: tomato),
                onPressed: clear,
                icon: const Icon(Icons.delete_outline),
                label: const Text('Clear Records'))
        ]),
        if (loading) const LinearProgressIndicator()
      ])),
      if (rows.isEmpty && !loading)
        const FarmCard(
            child: Column(children: [
          Icon(Icons.history, color: forest, size: 42),
          Text('No Saved Harvest Records Yet',
              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 17)),
          Text(
              'Scan tomatoes in Check Crops and save your findings to see records here.',
              textAlign: TextAlign.center,
              style: TextStyle(color: muted))
        ])),
      if (rows.isNotEmpty) ...[
        _metric('TOTAL CHECKS', '${rows.length}', 'Inspections recorded',
            Icons.tag, forest),
        _metric('LATEST RIPENESS', '${latest?['readiness'] ?? 0}%',
            'From check #${latest?['id']}', Icons.query_stats, forest),
        _metric(
            'RIPENESS DELTA',
            delta == null
                ? 'N/A'
                : '${delta > 0 ? '+' : ''}${delta.toStringAsFixed(1)}%',
            'vs prior inspection',
            Icons.trending_up,
            amber),
        _metric('TOMATOES FOUND', '${latest?['total'] ?? 0}',
            'Counted in latest photo', Icons.layers_outlined, forest),
        FarmCard(
            child:
                Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          const Text('Ripeness Progression',
              style: TextStyle(fontSize: 17, fontWeight: FontWeight.w800)),
          const SizedBox(height: 8),
          ReadinessChart(rows: rows),
          const SizedBox(height: 8),
          const Wrap(alignment: WrapAlignment.center, spacing: 14, children: [
            _Legend(color: Color(0xFF10B981), text: 'Readiness Score'),
            _Legend(color: tomato, text: 'Ripe Share (%)')
          ])
        ])),
        FarmCard(
            child:
                Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          const Text('Tomato Counts by Check',
              style: TextStyle(fontSize: 17, fontWeight: FontWeight.w800)),
          const SizedBox(height: 8),
          CountBars(rows: rows),
          const Wrap(alignment: WrapAlignment.center, spacing: 14, children: [
            _Legend(color: Color(0xFF84CC16), text: 'Unripe'),
            _Legend(color: Color(0xFFF59E0B), text: 'Semiripe'),
            _Legend(color: Color(0xFFEF4444), text: 'Ripe')
          ])
        ])),
        FarmCard(
            child:
                Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          const Heading('Daily Farm Harvest Report',
              'Create a shareable summary of field conditions for workers or buyers',
              icon: Icons.description_outlined, color: Color(0xFF2563EB)),
          const SizedBox(height: 12),
          Wrap(spacing: 8, children: [
            PrimaryButton(
                label: reportBusy ? 'Writing Report…' : 'Create Harvest Report',
                icon: Icons.refresh,
                loading: reportBusy,
                onPressed: makeReport),
            if (report != null)
              OutlinedButton.icon(
                  onPressed: shareReport,
                  icon: const Icon(Icons.download_outlined),
                  label: const Text('Share / Download .txt'))
          ]),
          const SizedBox(height: 10),
          Container(
              width: double.infinity,
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                  color: farmSurface(context),
                  border: Border.all(color: border),
                  borderRadius: BorderRadius.circular(13)),
              child: Text(
                  report ??
                      'Click “Create Harvest Report” to generate an easy-to-read daily field briefing.',
                  style: TextStyle(
                      color: report == null
                          ? farmMuted(context)
                          : farmText(context),
                      height: 1.55)))
        ])),
        FarmCard(
            child:
                Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          const Text('Past Field Inspections',
              style: TextStyle(fontWeight: FontWeight.w800, fontSize: 17)),
          const SizedBox(height: 10),
          TextField(
              controller: search,
              onChanged: (v) => setState(() => query = v),
              decoration: const InputDecoration(
                  prefixIcon: Icon(Icons.search),
                  hintText: 'Filter records…',
                  border: OutlineInputBorder(),
                  isDense: true)),
          const SizedBox(height: 9),
          ...filtered.map(_record)
        ])),
      ]
    ]);
  }

  Widget _metric(
          String title, String value, String sub, IconData icon, Color color) =>
      FarmCard(
          padding: const EdgeInsets.all(15),
          child:
              Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Row(children: [
              Expanded(
                  child: Text(title,
                      style: TextStyle(
                          color: farmMuted(context),
                          fontSize: 11,
                          fontWeight: FontWeight.bold,
                          letterSpacing: .5))),
              Icon(icon, color: color)
            ]),
            Text(value,
                style: TextStyle(
                    fontSize: 34, fontWeight: FontWeight.w800, color: color)),
            Text(sub, style: TextStyle(fontSize: 12, color: farmMuted(context)))
          ]));
  Widget _record(Map<String, dynamic> r) {
    final id = r['id'] as int;
    final readiness = ((r['readiness'] ?? 0) as num).toDouble();
    return Container(
        margin: const EdgeInsets.only(bottom: 8),
        padding: const EdgeInsets.all(11),
        decoration: BoxDecoration(
            color: farmSurface(context),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: border)),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(children: [
            Text('#$id', style: const TextStyle(fontWeight: FontWeight.w800)),
            const SizedBox(width: 7),
            Expanded(
                child: Text('${r['source'] ?? 'Photo'}',
                    style: const TextStyle(color: muted, fontSize: 12),
                    overflow: TextOverflow.ellipsis)),
            Text('${r['total']} tomatoes',
                style:
                    const TextStyle(fontWeight: FontWeight.w600, fontSize: 11))
          ]),
          Text('${r['created_at'] ?? 'Recently'}',
              style: const TextStyle(color: muted, fontSize: 11)),
          const SizedBox(height: 6),
          Row(children: [
            Text('${readiness.toStringAsFixed(1)}%',
                style: const TextStyle(
                    color: forest, fontWeight: FontWeight.bold)),
            const SizedBox(width: 8),
            Expanded(
                child: ClipRRect(
                    borderRadius: BorderRadius.circular(5),
                    child: LinearProgressIndicator(
                        value: (readiness / 100).clamp(0, 1),
                        minHeight: 6,
                        color: forest,
                        backgroundColor: border)))
          ]),
          const SizedBox(height: 5),
          Wrap(spacing: 5, children: [
            TextButton.icon(
                onPressed: () => widget.onAsk(id),
                icon: const Icon(Icons.chat_bubble_outline, size: 15),
                label: const Text('Ask Advisor')),
            IconButton(
                tooltip: 'Delete record',
                onPressed: () => remove(id),
                icon: const Icon(Icons.delete_outline, color: tomato))
          ])
        ]));
  }
}

class _Legend extends StatelessWidget {
  const _Legend({required this.color, required this.text});
  final Color color;
  final String text;
  @override
  Widget build(BuildContext c) =>
      Row(mainAxisSize: MainAxisSize.min, children: [
        Container(width: 10, height: 4, color: color),
        const SizedBox(width: 5),
        Text(text, style: const TextStyle(fontSize: 10, color: muted))
      ]);
}

const _questions = [
  'When is the best time of day to pick ripe tomatoes?',
  'Should I pick turning tomatoes now or wait?',
  'How should I store these tomatoes after picking?',
  'What should I check on the fruit besides color before harvesting?'
];

class AdvisorScreen extends StatefulWidget {
  const AdvisorScreen({super.key, this.sessionId});
  final int? sessionId;
  @override
  State<AdvisorScreen> createState() => _AdvisorScreenState();
}

class _AdvisorScreenState extends State<AdvisorScreen> {
  final input = TextEditingController();
  final messages = <Map<String, String>>[];
  List<Map<String, dynamic>> sessions = [];
  int? selected;
  bool loading = false;
  String? error;
  @override
  void initState() {
    super.initState();
    selected = widget.sessionId;
    _loadSessions();
  }

  @override
  void didUpdateWidget(covariant AdvisorScreen old) {
    super.didUpdateWidget(old);
    if (widget.sessionId != old.sessionId && widget.sessionId != null) {
      setState(() => selected = widget.sessionId);
    }
  }

  Future<void> _loadSessions() async {
    try {
      final data = await FarmApi.history(limit: 50);
      if (!mounted) return;
      setState(() {
        sessions = data;
        selected ??= data.isEmpty ? null : data.first['id'] as int;
      });
    } catch (e) {
      if (mounted) {
        setState(() => error = 'Could not load saved inspections: $e');
      }
    }
  }

  Future<void> send([String? prompt]) async {
    final q = (prompt ?? input.text).trim();
    if (q.isEmpty || loading) return;
    input.clear();
    setState(() {
      error = null;
      messages.add({'role': 'user', 'content': q});
      loading = true;
    });
    try {
      final r = await FarmApi.chat(q, selected, messages);
      if (mounted) {
        setState(() => messages
            .add({'role': 'assistant', 'content': '${r['answer'] ?? ''}'}));
      }
    } catch (e) {
      if (mounted) setState(() => error = 'Advisor error: $e');
    } finally {
      if (mounted) setState(() => loading = false);
    }
  }

  @override
  void dispose() {
    input.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final current = sessions.where((s) => s['id'] == selected).firstOrNull;
    return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      FarmCard(
          child:
              Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        const Heading('Farm Advisor',
            'Ask about crop ripeness, picking timing, or tomato care',
            icon: Icons.chat_bubble_outline, color: Color(0xFF2563EB)),
        if (messages.isNotEmpty)
          Align(
              alignment: Alignment.centerRight,
              child: TextButton.icon(
                  onPressed: () => setState(() => messages.clear()),
                  icon: const Icon(Icons.delete_outline),
                  label: const Text('Clear Conversation')))
      ])),
      FarmCard(
          child:
              Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        const Text('Field Inspection Check',
            style: TextStyle(fontSize: 15, fontWeight: FontWeight.w800)),
        const SizedBox(height: 8),
        if (sessions.isEmpty)
          const Text(
              'No saved checks. Inspect your tomatoes first to discuss specific counts.',
              style: TextStyle(color: muted, fontSize: 12))
        else
          DropdownButtonFormField<int>(
              initialValue: selected,
              decoration: const InputDecoration(
                  border: OutlineInputBorder(), isDense: true),
              items: sessions
                  .map((s) => DropdownMenuItem(
                      value: s['id'] as int,
                      child: Text(
                          'Check #${s['id']} · ${s['total']} tomatoes (${s['readiness']}% ready)',
                          overflow: TextOverflow.ellipsis)))
                  .toList(),
              onChanged: (v) => setState(() => selected = v)),
        if (current != null) ...[
          const SizedBox(height: 10),
          Container(
              width: double.infinity,
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                  color: const Color(0xFFF0FDF4),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: const Color(0xFFBBF7D0))),
              child: Column(children: [
                _summaryRow('Tomatoes Checked', '${current['total']}'),
                _summaryRow('Ripeness Score', '${current['readiness']}%'),
                _summaryRow('Date', '${current['created_at'] ?? ''}')
              ]))
        ]
      ])),
      FarmCard(
          child:
              Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        const Text('Common Questions',
            style: TextStyle(fontSize: 15, fontWeight: FontWeight.w800)),
        const SizedBox(height: 8),
        ..._questions.map((q) => Container(
            width: double.infinity,
            margin: const EdgeInsets.only(bottom: 7),
            child: OutlinedButton(
                onPressed: loading ? null : () => send(q),
                style: OutlinedButton.styleFrom(
                    alignment: Alignment.centerLeft,
                    foregroundColor: ink,
                    side: const BorderSide(color: border),
                    padding: const EdgeInsets.symmetric(
                        horizontal: 13, vertical: 12)),
                child: Text(q,
                    textAlign: TextAlign.left,
                    style: const TextStyle(fontSize: 12)))))
      ])),
      FarmCard(
          padding: EdgeInsets.zero,
          child: Column(children: [
            Container(
                height: 330,
                padding: const EdgeInsets.all(14),
                child: messages.isEmpty
                    ? const Center(
                        child:
                            Column(mainAxisSize: MainAxisSize.min, children: [
                        Icon(Icons.auto_awesome, color: forest, size: 36),
                        SizedBox(height: 8),
                        Text('Farm Ripeness Advisor',
                            style: TextStyle(
                                fontSize: 18, fontWeight: FontWeight.w800)),
                        SizedBox(height: 5),
                        Text(
                            'Ask questions about when to pick, how to store tomatoes, or what to do with green and turning fruit.',
                            textAlign: TextAlign.center,
                            style: TextStyle(color: muted, fontSize: 12))
                      ]))
                    : ListView(
                        children: messages
                            .map((m) => Align(
                                  alignment: m['role'] == 'user'
                                      ? Alignment.centerRight
                                      : Alignment.centerLeft,
                                  child: Container(
                                    constraints:
                                        const BoxConstraints(maxWidth: 290),
                                    margin: const EdgeInsets.only(bottom: 10),
                                    padding: const EdgeInsets.all(12),
                                    decoration: BoxDecoration(
                                        color:
                                            m['role'] == 'user' ? forest : page,
                                        borderRadius:
                                            BorderRadius.circular(15)),
                                    child: Column(
                                        crossAxisAlignment:
                                            CrossAxisAlignment.start,
                                        children: [
                                          Text(
                                              m['role'] == 'user'
                                                  ? 'You'
                                                  : 'Farm Advisor',
                                              style: TextStyle(
                                                  fontSize: 10,
                                                  fontWeight: FontWeight.bold,
                                                  color: m['role'] == 'user'
                                                      ? Colors.white70
                                                      : forest)),
                                          const SizedBox(height: 4),
                                          Text(m['content']!,
                                              style: TextStyle(
                                                  height: 1.4,
                                                  color: m['role'] == 'user'
                                                      ? Colors.white
                                                      : ink)),
                                        ]),
                                  ),
                                ))
                            .toList())),
            if (loading) const LinearProgressIndicator(),
            if (error != null)
              Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 12),
                  child: Text(error!,
                      style: const TextStyle(color: tomato, fontSize: 12))),
            Container(
                padding: const EdgeInsets.all(10),
                decoration: const BoxDecoration(
                    border: Border(top: BorderSide(color: border))),
                child: Row(children: [
                  Expanded(
                      child: TextField(
                          controller: input,
                          onSubmitted: (_) => send(),
                          decoration: const InputDecoration(
                              hintText: 'Ask a question about your tomatoes…',
                              border: OutlineInputBorder(),
                              isDense: true,
                              contentPadding: EdgeInsets.all(12)))),
                  const SizedBox(width: 8),
                  IconButton.filled(
                      onPressed: loading ? null : () => send(),
                      icon: const Icon(Icons.send)),
                ])),
          ]))
    ]);
  }

  Widget _summaryRow(String label, String value) => Padding(
      padding: const EdgeInsets.symmetric(vertical: 3),
      child: Row(children: [
        Expanded(
            child: Text(label,
                style: const TextStyle(color: muted, fontSize: 12))),
        Flexible(
            child: Text(value,
                style:
                    const TextStyle(fontWeight: FontWeight.bold, fontSize: 12),
                textAlign: TextAlign.right))
      ]));
}

class GuideScreen extends StatelessWidget {
  const GuideScreen({super.key});
  @override
  Widget build(BuildContext context) =>
      Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        FarmCard(
            child:
                Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          const Heading('Tomato Harvesting Guide & Best Practices',
              'Practical guide to ripeness, picking methods, and storage',
              icon: Icons.menu_book_outlined),
          const SizedBox(height: 12),
          Container(
              padding: const EdgeInsets.all(13),
              decoration: BoxDecoration(
                  color: page,
                  borderRadius: BorderRadius.circular(15),
                  border: Border.all(color: border)),
              child: Column(children: [
                ClipRRect(
                    borderRadius: BorderRadius.circular(12),
                    child: Image.asset('assets/images/tomato_stages.jpg',
                        fit: BoxFit.cover)),
                const SizedBox(height: 8),
                const Text(
                    'Green (Immature) → Turning (Breaker) → Ripe (Mature)',
                    textAlign: TextAlign.center,
                    style: TextStyle(color: muted, fontSize: 11))
              ]))
        ])),
        const _GuideStage(
            color: forest,
            name: 'Green (Immature)',
            badge: 'Leave on Vine',
            description:
                'The tomato is firm, hard, and solid green. Sugars and internal flavor gel are still forming. Do not pick yet unless making green preserves.',
            timing: 'Needs 7–14 more days to begin ripening.'),
        const _GuideStage(
            color: amber,
            name: 'Turning / Breaker',
            badge: 'Pick for Shipping',
            description:
                'The first visible break of color from green to tannish-yellow or pink on the bottom. Internal ripening has permanently begun.',
            timing: 'Ideal for market shipping; ripens fully in 2–4 days.'),
        const _GuideStage(
            color: tomato,
            name: 'Ripe & Mature',
            badge: 'Harvest Today',
            description:
                'Over 90% of the surface is rich crimson red. The fruit gives slightly to gentle finger pressure and has reached peak sweetness and aroma.',
            timing: 'Pick today to prevent splitting or over-softening.'),
        FarmCard(
            child:
                Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          const Text('Field Harvesting Best Practices',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800)),
          const SizedBox(height: 10),
          for (final practice in const [
            (
              'Pick in the Cool Morning',
              'Harvest early in the morning when fruit is cool and firm. Avoid the hot afternoon sun.'
            ),
            (
              'Keep the Calyx (Stem Cap) Intact',
              'Gently snap or clip the tomato with its green calyx attached to help protect against moisture loss and decay.'
            ),
            (
              'Avoid Refrigeration for Unripe Fruit',
              'Never store green or turning tomatoes below 13°C (55°F). Cold temperatures can damage flavor and texture.'
            ),
            (
              'Store Stem-Side Down',
              'Keep tomatoes stem-side down to prevent rolling, bruising, and air leakage through the stem scar.'
            )
          ])
            _practice(context, practice.$1, practice.$2)
        ])),
        FarmCard(
            child:
                Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          const Text('Recommended Temperatures',
              style: TextStyle(
                  color: amber, fontSize: 17, fontWeight: FontWeight.w800)),
          const SizedBox(height: 8),
          _temperature(
              context, 'Turning / Breaker Fruit', '13°C – 18°C (55°F – 65°F)'),
          _temperature(
              context, 'Fully Ripe Fruit', '18°C – 21°C (65°F – 70°F)'),
          _temperature(context, 'Minimum Threshold', 'Never below 12°C (54°F)',
              color: tomato)
        ])),
        FarmCard(
            child:
                Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          const Text('Frequently Asked Questions',
              style: TextStyle(fontSize: 17, fontWeight: FontWeight.w800)),
          const SizedBox(height: 10),
          const Text('Q: How often should I check the crops?',
              style: TextStyle(fontWeight: FontWeight.bold)),
          Text(
              'During hot summer days, tomatoes ripen rapidly. Check your fields every 2 to 3 days to catch fruit at the ideal stage.',
              style: TextStyle(color: farmMuted(context), height: 1.45)),
          const SizedBox(height: 12),
          const Text('Q: Why do some tomatoes crack near the stem?',
              style: TextStyle(fontWeight: FontWeight.bold)),
          Text(
              'Heavy rain or sudden over-watering after a dry spell causes fruit to take up water faster than skin can expand. Harvest turning fruit before expected storms.',
              style: TextStyle(color: farmMuted(context), height: 1.45))
        ]))
      ]);
  Widget _practice(BuildContext context, String t, String d) => Container(
      width: double.infinity,
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
          color: farmSurface(context),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: border)),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(t, style: const TextStyle(fontWeight: FontWeight.w700)),
        Text(d,
            style:
                TextStyle(color: farmMuted(context), fontSize: 12, height: 1.4))
      ]));
  Widget _temperature(BuildContext context, String label, String value,
          {Color color = ink}) =>
      Padding(
          padding: const EdgeInsets.symmetric(vertical: 9),
          child: Row(children: [
            Expanded(
                child: Text(label,
                    style: TextStyle(color: farmMuted(context), fontSize: 12))),
            Flexible(
                child: Text(value,
                    textAlign: TextAlign.right,
                    style: TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 12,
                        color: color)))
          ]));
}

class _GuideStage extends StatelessWidget {
  const _GuideStage(
      {required this.color,
      required this.name,
      required this.badge,
      required this.description,
      required this.timing});
  final Color color;
  final String name, badge, description, timing;
  @override
  Widget build(BuildContext c) => FarmCard(
      padding: const EdgeInsets.all(17),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Container(
            height: 4,
            decoration: BoxDecoration(
                color: color, borderRadius: BorderRadius.circular(5))),
        const SizedBox(height: 10),
        Row(children: [
          Expanded(
              child: Text(name,
                  style: TextStyle(
                      color: color,
                      fontSize: 17,
                      fontWeight: FontWeight.w800))),
          Flexible(
              child: Text(badge,
                  textAlign: TextAlign.right,
                  style: TextStyle(
                      color: farmMuted(c),
                      fontSize: 10,
                      fontWeight: FontWeight.bold)))
        ]),
        const SizedBox(height: 6),
        Text(description,
            style: TextStyle(color: farmMuted(c), fontSize: 12, height: 1.5)),
        const Divider(height: 18),
        Text('⏱  $timing', style: TextStyle(color: farmMuted(c), fontSize: 11))
      ]));
}
