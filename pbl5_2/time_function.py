import time
import time_function
from datetime import datetime


# check sau 2 giờ moi dc cho ăn
def check_current_time_against_passed_time(appointment_time):
    # Get the current time
    current_time = datetime.now()
    print("Current time:", current_time)

    # Calculate the time difference
    time_difference_hours = (current_time - appointment_time).total_seconds() / 3600

    # Check if it's been more than 2 hours
    if time_difference_hours >= 2:
        # It's been more than 2 hours
        print(f"It's been more than {time_difference_hours:.2f} hours since the appointment time!")
        return True
    else:
        # It's not been more than 2 hours
        print(f"There are still {2 - time_difference_hours:.2f} hours until the appointment time.")
        return False

def check_set_timer(listOfTimer):
    currentTime = datetime.now().strftime('%H:%M')
    for timer in listOfTimer:
        if timer == currentTime:
            return True
    return False


def schedule_alarm(hour, minute):
    check = "activate"
    while True:
        current_time = datetime.now()
        if current_time.hour == hour and current_time.minute == minute:
            # Perform necessary actions when the alarm is activated
            return check
        time.sleep(60)  # Check again every 1 minute