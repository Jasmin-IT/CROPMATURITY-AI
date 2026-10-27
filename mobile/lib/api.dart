import 'dart:async';
import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:image_picker/image_picker.dart';

const apiBase =
    String.fromEnvironment('API_BASE', defaultValue: 'http://10.0.2.2:8000');

class FarmApi {
  static Uri url(String path) => Uri.parse('$apiBase$path');
  static Future<dynamic> _decode(http.Response r) async {
    final value = r.body.isEmpty ? null : jsonDecode(r.body);
    if (r.statusCode >= 400) {
      final detail = value is Map ? value['detail'] : null;
      throw Exception(detail ?? 'Request failed (${r.statusCode})');
    }
    return value;
  }

  static Future<Map<String, dynamic>> health() async =>
      Map<String, dynamic>.from(await _decode(await http.get(url('/health'))));
  static Future<Map<String, dynamic>> predict(XFile file,
      {bool save = true}) async {
    final req =
        http.MultipartRequest('POST', url('/predict?annotate=true&save=$save'));
    req.files.add(http.MultipartFile.fromBytes('file', await file.readAsBytes(),
        filename: file.name));
    final stream = await req.send();
    final response =
        http.Response(await stream.stream.bytesToString(), stream.statusCode);
    return Map<String, dynamic>.from(await _decode(response));
  }

  static Future<List<Map<String, dynamic>>> history({int limit = 100}) async {
    final rows =
        await _decode(await http.get(url('/history?limit=$limit'))) as List;
    return rows.map((e) => Map<String, dynamic>.from(e)).toList();
  }

  static Future<void> deleteHistory(int id) async =>
      _decode(await http.delete(url('/history/$id')));
  static Future<void> clearHistory() async =>
      _decode(await http.delete(url('/history')));
  static Future<Map<String, dynamic>> aiAnalysis(int? id) async =>
      Map<String, dynamic>.from(await _decode(await http
          .post(url('/ai/analyze${id == null ? '' : '?detection_id=$id'}'))));
  static Future<Map<String, dynamic>> dailyReport(int? id) async =>
      Map<String, dynamic>.from(await _decode(await http
          .post(url('/ai/report${id == null ? '' : '?detection_id=$id'}'))));
  static Future<Map<String, dynamic>> chat(
      String question, int? id, List<Map<String, String>> history) async {
    late final http.Response r;
    try {
      r = await http
          .post(url('/ai/chat'),
              headers: {'Content-Type': 'application/json'},
              body: jsonEncode({
                'question': question,
                'detection_id': id,
                'history': history
              }))
          .timeout(const Duration(seconds: 105));
    } on TimeoutException {
      throw Exception(
          'The advisor request timed out. Check that the backend and internet connection are available, then try again.');
    }
    return Map<String, dynamic>.from(await _decode(r));
  }

  static Future<Map<String, dynamic>> liveFrame(XFile file) async {
    final req =
        http.MultipartRequest('POST', url('/live/frame?masks=false&imgsz=640'));
    req.files.add(http.MultipartFile.fromBytes('file', await file.readAsBytes(),
        filename: 'frame.jpg'));
    final s = await req.send();
    return Map<String, dynamic>.from(await _decode(
        http.Response(await s.stream.bytesToString(), s.statusCode)));
  }

  static Future<int> saveLive(Map<String, dynamic> payload) async {
    final r = await http.post(url('/live/save-snapshot'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode(payload));
    return (await _decode(r))['id'] as int;
  }
}
