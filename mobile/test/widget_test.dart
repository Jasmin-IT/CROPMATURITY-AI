import 'package:flutter_test/flutter_test.dart';
import 'package:agri_harvest_mobile/main.dart';

void main() {
  testWidgets('Crop Maturity AI opens on the crop inspection screen',
      (tester) async {
    await tester.pumpWidget(const AgriHarvestApp());
    expect(find.text('Inspect Your Crops'), findsOneWidget);
    expect(find.text('Crop Maturity AI'), findsOneWidget);
  });
}
