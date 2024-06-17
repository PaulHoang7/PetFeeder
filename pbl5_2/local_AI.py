import time
import cv2
from datetime import datetime
import time_function  # Assuming this module defines time-related functions
import yolo_class as ly  # Assuming this module handles object detection using YOLO
import pyrebase
import controller_firebase  # Assuming this module interacts with Firebase
from collections import Counter
import threading
# import datetime

firebaseConfig = {
    "apiKey": "AIzaSyDKekclUFx6lNdLoEVDvzfrO4C2ygU6nYM",
    "authDomain": "pbl5-94a59.firebaseapp.com",
    "databaseURL": "https://pbl5-94a59-default-rtdb.firebaseio.com",
    "projectId": "pbl5-94a59",
    "storageBucket": "pbl5-94a59.appspot.com",
    "messagingSenderId": "898822763888",
    "appId": "1:898822763888:web:d0a4473478f6443d4f4bb5",
    "measurementId": "G-4B0C59YV3D",
    "serviceAccount": "service_account.json"
}

download_interval = 3

def check_download_status():
    try:
        firebase = pyrebase.initialize_app(firebaseConfig)
        db = firebase.database()
        download_status = db.child('download').get().val()
        if download_status is not None:
            return download_status
        else:
            print("Error retrieving download status from Firebase")
            return False
    except Exception as e:
        print(f"An error occurred while checking download status on Firebase: {e}")
        return False

def get_timer(timerOf):
    try:
        firebase = pyrebase.initialize_app(firebaseConfig)
        db = firebase.database()
        start_time = time.time()
        download_status = db.child(timerOf).get()
        if download_status.each() is not None:
            time_values = [child.val().get('time') for child in download_status.each() if child.val().get('time') is not None]
            end_time = time.time()
            print(f"Time taken to retrieve data: {end_time - start_time} seconds")
            return time_values
        else:
            print("Error retrieving download status from Firebase")
            return []
    except Exception as e:
        print(f"An error occurred while checking download status on Firebase: {e}")
        return []

def download_and_process_images():
    try:
        controller_firebase.update_waitting(False)
        firebase = pyrebase.initialize_app(firebaseConfig)
        storage1 = firebase.storage()
        storage1.download("data/1.jpg", "photo1.jpg")
        storage2 = firebase.storage()
        storage2.download("data/2.jpg", "photo2.jpg")
        storage3 = firebase.storage()
        storage3.download("data/3.jpg", "photo3.jpg")
        photos = ["photo1.jpg", "photo2.jpg", "photo3.jpg"]
        labels_list = []
        for photo in photos:
            try:
                im = cv2.imread(photo)
                if im is not None:
                    obj = ly.LYL()
                    obj.init(im)
                    if obj.getObject() is not None:
                        labels_list.append(obj.getObject())
            except Exception as e:
                print(f"Error processing an image in the picture list", e)
        label_counts = Counter(labels_list)
        most_common_label = label_counts.most_common(1)
        if most_common_label:
            response = most_common_label[0][0]
            print(f"Most common label: {response}")
            dog_nearest_time = controller_firebase.get_latest_time_of_dog_auto_category_from_history()
            cat_nearest_time = controller_firebase.get_latest_time_of_cat_auto_category_from_history()
            if dog_nearest_time == None :
                dog_check = True
            else:
                dog_time = datetime.strptime(dog_nearest_time, "%Y-%m-%d %H:%M:%S")
                dog_check = time_function.check_current_time_against_passed_time(dog_time)
            if cat_nearest_time == None:
                cat_check = True
            else:
                cat_time = datetime.strptime(cat_nearest_time, "%Y-%m-%d %H:%M:%S")
                cat_check = time_function.check_current_time_against_passed_time(cat_time)
            if response == "dog" and dog_check :
                controller_firebase.update_detect_status("dog")
                controller_firebase.update_detect_image("dog")
                controller_firebase.update_download_status()
                current_time = datetime.now()
                formatted_time = current_time.strftime("%Y-%m-%d %H:%M:%S")
                string_time = str(formatted_time)
                controller_firebase.add_data_to_history(response, "auto", string_time)
                controller_firebase.update_detect_status("No detections")
            if response == "cat" and  cat_check :
                controller_firebase.update_detect_status("cat")
                controller_firebase.update_detect_image("cat")
                controller_firebase.update_download_status()
                current_time = datetime.now()
                formatted_time = current_time.strftime("%Y-%m-%d %H:%M:%S")
                string_time = str(formatted_time)
                controller_firebase.add_data_to_history(response, "auto", string_time)
                controller_firebase.update_detect_status("No detections")
            if response == "dog" and not dog_check or response == "cat" and not cat_check:
                controller_firebase.update_waitting(True)
                controller_firebase.update_download_status()
                controller_firebase.update_detect_status("No detections")
                print("not enough time")
            if response == "No detections":
                controller_firebase.update_detect_status("No detections")
                controller_firebase.update_detect_image("No detections")
        else:
            print("No objects detected")
            controller_firebase.update_detect_status("No detections")
            controller_firebase.update_detect_image("No detections")
        controller_firebase.update_download_status()
    except Exception as e:
        print(f"An error occurred during download or processing: {e}")

def set_timer():
    while True:
        timerOfDog = get_timer('timersOfDog')
        timerOfCat = get_timer('timersOfCat')
        setCat = False
        setDog = False
        current_time = datetime.now()
        formatted_time = current_time.strftime("%Y-%m-%d %H:%M:%S")
        string_time = str(formatted_time)
        if time_function.check_set_timer(timerOfDog):
            setDog = True
        else:
            setDog = False

        if time_function.check_set_timer(timerOfCat):
            setCat = True
        else:
            setCat = False

        if setCat and setDog:
            controller_firebase.update_detect_status("dog and cat")
            controller_firebase.delete_timer_by_time(timerOfDog, 'timersOfDog')
            controller_firebase.delete_timer_by_time(timerOfCat, 'timersOfCat')
            controller_firebase.add_data_to_history("dog", "remote", string_time)
            controller_firebase.add_data_to_history("cat", "remote", string_time)
        elif setCat:
            controller_firebase.update_detect_status("cat")
            controller_firebase.delete_timer_by_time(timerOfCat, 'timersOfCat')
            controller_firebase.add_data_to_history("cat", "remote", string_time)
        elif setDog:
            controller_firebase.update_detect_status("dog")
            controller_firebase.delete_timer_by_time(timerOfDog, 'timersOfDog')
            controller_firebase.add_data_to_history("dog", "remote", string_time)

        time.sleep(1)  # Sleep for a short duration to avoid busy waiting

def download_process():
    while True:
        check = check_download_status()
        if check:
            controller_firebase.update_detect_status("Detecting")
            print("processing")
            download_and_process_images()
        else:
            print("no pictures to process")
        time.sleep(download_interval)

if __name__ == "__main__":
    timer_thread = threading.Thread(target=set_timer)
    download_thread = threading.Thread(target=download_process)

    timer_thread.start()
    download_thread.start()

    timer_thread.join()
    download_thread.join()
