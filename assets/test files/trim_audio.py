"""
Script to trim audio file to 5 minutes
"""
from pydub import AudioSegment

# Input and output files
input_file = "Opa 1.m4a"
output_file = "Opa 1_5min.m4a"

# Duration in milliseconds (5 minutes = 300,000 ms)
duration_ms = 5 * 60 * 1000

print(f"Loading audio file: {input_file}")
audio = AudioSegment.from_file(input_file, format="m4a")

print(f"Original duration: {len(audio) / 1000 / 60:.2f} minutes")

# Trim to first 5 minutes
trimmed_audio = audio[:duration_ms]

print(f"Trimmed duration: {len(trimmed_audio) / 1000 / 60:.2f} minutes")

# Export as m4a
print(f"Exporting to: {output_file}")
trimmed_audio.export(output_file, format="ipod")

print("Done!")
