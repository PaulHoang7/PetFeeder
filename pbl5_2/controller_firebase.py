from firebase import firebase
firebase = firebase.FirebaseApplication("https://pbl5-94a59-default-rtdb.firebaseio.com",
                                        None)

def update_detect_status(detect):
    firebase.put('/', 'detect', detect)

def update_detect_image(detect_image):
    firebase.put('/', 'detect_image', detect_image)

def add_toggle_light_obstacle_dog():
    firebase.put('/', 'food_dog', False)


def update_toggle_light_obstacle_dog():
    firebase.put('/', 'food_dog', True)


def add_toggle_light_obstacle_cat():
    firebase.put('/', 'food_cat', False)


def update_toggle_light_obstacle_cat():
    firebase.put('/', 'food_cat', True)

def update_waitting(tf):
    firebase.put('/','waitting', tf)

def add_data_to_history(name, category, time):
    data = {'name': name, 'category': category, 'time': time}
    result = firebase.post('/history', data)
    print("Data added successfully with key:", result['name'])


def get_latest_time_of_cat_auto_category_from_history():
    # Truy vấn dữ liệu từ Firebase
    result = firebase.get('/history', None)

    if result:
        # Nếu có dữ liệu
        latest_time = None
        for key, value in result.items():
            # Lặp qua tất cả các mục và chọn ra thời gian mới nhất của mục có category là "tự động"
            if value.get('category') == 'auto' and value.get('name') == 'cat':
                if latest_time is None or value['time'] > latest_time:
                    latest_time = value['time']

        if latest_time:
            return latest_time
        else:
            return None
    else:
        return None

def get_latest_time_of_dog_auto_category_from_history():
    # Truy vấn dữ liệu từ Firebase
    result = firebase.get('/history', None)

    if result:
        # Nếu có dữ liệu
        latest_time = None
        for key, value in result.items():
            # Lặp qua tất cả các mục và chọn ra thời gian mới nhất của mục có category là "tự động"
            if value.get('category') == 'auto' and value.get('name') == 'dog':
                if latest_time is None or value['time'] > latest_time:
                    latest_time = value['time']

        if latest_time:
            return latest_time
        else:
            return None
    else:
        return None


def get_timers_of_dog():
    # Query data from Firebase
    result = firebase.get('/timersOfDog', None)

    if result:
        # If there is data
        for key, value in result.items():
            # Access the value of 'time'
            time_value = value.get('time')
            if time_value is not None:
                return time_value
        return None
    else:
        return None


def get_timers_of_cat():
    # Query data from Firebase
    result = firebase.get('/timersOfCat', None)

    if result:
        # If there is data
        for key, value in result.items():
            # Access the value of 'time'
            time_value = value.get('time')
            if time_value is not None:
                return time_value
        return None
    else:
        return None

def delete_timer_by_time(time_value, tableAnimal):
    # Lấy tất cả các mục từ /timersOfDog
    result = firebase.get(tableAnimal, None)

    if result:
        for key, value in result.items():
            for time in time_value:
                if value.get('time') == time:
                    # Xóa mục hiện tại khỏi Firebase
                    firebase.delete(f'/{tableAnimal}/{key}', None)
                    print(f"Deleted timer with time: {time_value}")
                    return True  # Trả về True nếu xóa thành công
    print(f"Timer with time: {time_value} not found")
    return False  # Trả về False nếu không tìm thấy

def update_download_status():
    firebase.put('/', 'download', False)