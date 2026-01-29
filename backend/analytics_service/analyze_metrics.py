import json
import logging
from datetime import datetime
from typing import List, Dict

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

class MetricsAnalyzer:
    def __init__(self):
        self.data_source = "analytics_db"

    def analyze_attendance(self, attendance_data: List[Dict]) -> float:
        """
        Calculates the average attendance rate from a list of attendance records.
        """
        if not attendance_data:
            return 0.0
        
        total_sessions = len(attendance_data)
        present_count = sum(1 for record in attendance_data if record.get('present'))
        
        rate = (present_count / total_sessions) * 100
        logging.info(f"Attendance analysis complete: {rate}%")
        return rate

    def predict_growth(self, current_members: int, growth_factor: float) -> int:
        """
        Simple linear projection of team growth.
        """
        projected = int(current_members * (1 + growth_factor))
        logging.info(f"Projected growth from {current_members} to {projected}")
        return projected

if __name__ == "__main__":
    # Simulate data processing for demonstration
    analyzer = MetricsAnalyzer()
    
    sample_data = [
        {"date": "2025-01-01", "present": True},
        {"date": "2025-01-08", "present": True},
        {"date": "2025-01-15", "present": False},
        {"date": "2025-01-22", "present": True},
    ]
    
    result = analyzer.analyze_attendance(sample_data)
    print(f"Weekly Attendance Rate: {result}%")
