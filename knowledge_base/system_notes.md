# About this monitoring system
Source: Project documentation (this system).

## Classes
The vision model detects three stages: unripe, semiripe and ripe. The team's working mapping is unripe = immature, semiripe = developing, ripe = mature.
The model does not detect an over-mature stage, because the training dataset (LaboroTomato) has no such label.

## Harvest readiness
Harvest readiness is a weighted score: ripe percentage plus half of the semiripe percentage. The ripe share on its own is also reported.
It is an indicator of the current maturity mix, not a prediction of the harvest date.

## Reliability
The YOLOv8 segmentation model scored a mask mAP50 of 0.884 on the held-out test set. Semiripe is the hardest class, because it sits between unripe and ripe.
Dark, blurry or crowded images, and fruit hidden by leaves, can reduce accuracy.