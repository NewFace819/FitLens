# Anatomy assets and mapping

Source: https://github.com/HichamELBSI/react-native-body-highlighter (retrieved 2026-10-27).
MIT copyright 2022 ELABBASSI Hicham. Full license: LICENSE.txt in this directory.
Original assets and wrapper sources preserved in private-review/heatmap/sources.

Adaptations: converted TypeScript SVG geometry to browser data, neutral silhouette fill, FitLens colors, grouped hit targets and keyboard selection. Each side's long lateral path from source `upper-back` is exposed as `lats`; the remaining scapular patches remain `upperBack`. Trapezius and lower-back source regions remain separate. `Upper back` is a simplified surface region, not an isolated rhomboid illustration. Source deltoid shapes remain a single Shoulders group, since they do not reliably isolate all three heads. Left and right are symmetric visualizations of logged exercises, not measured unilateral load. These are schematic training illustrations, not diagnostic anatomy.

Exercise associations in muscle-model.js are a manually curated, simplified catalogue for the prototype. Supporting-set weight 0.5 is a presentation convention, not a validated biological dose. One set can contribute to multiple groups. Unknown exercises and records without set logs are reported as missing, not inferred. Colors are relative to the maximum within the selected range and always accompanied by set counts.

Anatomy reference: UAMS Muscles of the Back Region — https://medicine.uams.edu/neuroscience/education/medical-school-courses/human-structure-module/anatomy-tables/muscle-tables/muscles-of-the-back-region/
Exercise references: Mayo Clinic seated row — https://www.mayoclinic.org/healthy-lifestyle/fitness/multimedia/seated-row/vid-20084688 ; NASM seated machine row — https://www.nasm.org/resource-center/exercise-library/seated-machine-row-close-grip
