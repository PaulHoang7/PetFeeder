import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, TextInput, Alert,Image } from 'react-native';
import Icon from 'react-native-vector-icons/FontAwesome'; // Import thư viện FontAwesome
import { getDatabase, ref, onValue, off ,set,push,remove,child} from 'firebase/database';
import DateTimePicker from '@react-native-community/datetimepicker';
import Toast from 'react-native-toast-message';
import { format } from 'date-fns';
import { getStorage, ref as storageRef, listAll, getDownloadURL } from 'firebase/storage';

const Tab = ({ label, isActive, onClick }) => {
  return (
    <TouchableOpacity onPress={onClick}>
    <View
        style={[
            styles.tab,
            { backgroundColor: isActive ? '#4CAF50' : 'transparent' },
        ]}
    >
        {label === 'Tab 1' ? (
             <Text style={styles.tabText}>REMOTE</Text>
        )   : label === 'Tab 2' ? (
          <Text style={styles.tabText}>AUTO</Text>
        ) 
        : label === 'Tab 3' ? (
          <Text style={styles.tabText}>HISTORY</Text>
        ) 
        : label === 'Tab 4' ? (
          <Text style={styles.tabText}>TOD</Text>
        ) : (
            <Text style={styles.tabText}>TOC</Text>
        )}
    </View>
</TouchableOpacity>
  );
};

const fetchImageUrls = async () => {
  const storage = getStorage();
  const listRef = storageRef(storage, 'data'); // Thay thế bằng đường dẫn tương đối của bạn trên Firebase Storage

  try {
    const res = await listAll(listRef);
    const urls = await Promise.all(
      res.items.map(itemRef => getDownloadURL(itemRef))
    );
    return urls;
  } catch (error) {
    console.error('Lỗi khi lấy URL ảnh:', error);
    return [];
  }
};
const Content = ({ isActive }) => {
  const [isDisabled, setIsDisabled] = useState(true);
  const [catToggle, setCatToggle] = useState(false);
  const [dogToggle, setDogToggle] = useState(false);
  const [foodWaiting, setFoodWaiting] = useState(false);

  useEffect(() => {
   

    const database = getDatabase();
    const toggleRef = ref(database, 'detect');
    const catToggleRef = ref(database, 'light_cat');
    const dogToggleRef = ref(database, 'light_dog');
    const foodWaitingRef = ref(database, 'waitting');

    const handleFoodWaitingChange = (snapshot) => {
      const value = snapshot.val();
      console.log('Food waiting value:', value);
      setFoodWaiting(value);
      if (value === true) {
        Toast.show({
          type: 'error',
          text1: 'Automatic problem:',
          text2: 'Already fed before!',
          position: 'bottom',
        });
        setTimeout(() => {
          set(foodWaitingRef, false);
        }, 5000);
      }
    };
    onValue(foodWaitingRef, handleFoodWaitingChange);

    const handleToggleChange = (snapshot) => {
      const toggleValue = snapshot.val();
      console.log('Received toggle value:', toggleValue);
      setIsDisabled(toggleValue !== "No detections");
    };

    const handleCatToggleChange = (snapshot) => {
      const toggleValue = snapshot.val();
      setCatToggle(toggleValue);
    };

    const handleDogToggleChange = (snapshot) => {
      const toggleValue = snapshot.val();
      setDogToggle(toggleValue);
    };

    const handleDetectChange = (snapshot) => {
      const detectValue = snapshot.val();
      if (detectValue === 'cat') {
        Toast.show({
          type: 'success',
          text1: 'Feed Notification',
          text2: 'Cat has been fed!',
          position: 'bottom',
        });
      } else if (detectValue === 'dog') {
        Toast.show({
          type: 'success',
          text1: 'Feed Notification',
          text2: 'Dog has been fed!',
          position: 'bottom',
        });
      }
    };

    const unsubscribe = onValue(toggleRef, handleToggleChange);
    const unsubscribeCat = onValue(catToggleRef, handleCatToggleChange);
    const unsubscribeDog = onValue(dogToggleRef, handleDogToggleChange);
    const unsubscribeDetect = onValue(toggleRef, handleDetectChange);

    return () => {
      unsubscribe();
      unsubscribeCat();
      unsubscribeDog();
      unsubscribeDetect();
      off(foodWaitingRef, 'value', handleFoodWaitingChange);
    };
  }, []);

  const logHistory = (name) => {
    const database = getDatabase();
    const historyRef = ref(database, 'history');
    const newHistoryRef = push(historyRef);

    const formattedDate = format(new Date(), 'yyyy-MM-dd HH:mm:ss'); // Format the date and time

    set(newHistoryRef, {
      name,
      category: 'remote',
      time: formattedDate,
    });
  };

  const handleCatClick = () => {
    if (isDisabled) return;
    const database = getDatabase();
    const detectRef = ref(database, 'detect');
    set(detectRef, 'cat');
    setIsDisabled(true);
    logHistory('cat');
  };

  const handleDogClick = () => {
    if (isDisabled) return;
    const database = getDatabase();
    const detectRef = ref(database, 'detect');
    set(detectRef, 'dog');
    logHistory('dog');
  };

  return (
    isActive && (
      <View style={styles.container}>
        <View style={styles.notificationContainer}>
          {catToggle && <Text style={styles.notificationText}>Hết đồ ăn cho mèo!</Text>}
          {dogToggle && <Text style={styles.notificationText}>Hết đồ ăn cho chó!</Text>}
        </View>
      
        <TouchableOpacity
          onPress={handleCatClick}
          style={[
            styles.catAndDogButton,
            isDisabled && styles.buttonDisabled,
          ]}
          disabled={isDisabled}
        >
          <Text style={styles.catAndDogButtonText}>Cat</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleDogClick}
          style={[
            styles.catAndDogButton,
            isDisabled && styles.buttonDisabled,
          ]}
          disabled={isDisabled}
        >
          <Text style={styles.catAndDogButtonText}>Dog</Text>
        </TouchableOpacity>
        <Toast />
      </View>
    )
  );
};

const AutoContent = ({ isActive }) => {
  const [imageUrls, setImageUrls] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [detectImage, setDetectImage] = useState(null);
  const [loading, setLoading] = useState(true); // State to track loading state

  useEffect(() => {
    const loadImages = async () => {
      try {
        const urls = await fetchImageUrls(); // Assuming fetchImageUrls() returns valid array of URLs
        setImageUrls(urls);
      } catch (error) {
        console.error('Error loading image URLs:', error);
      }
    };

    loadImages();

    const database = getDatabase();
    const detectImageRef = ref(database, 'detect_image');

    const unsubscribe = onValue(detectImageRef, (snapshot) => {
      const data = snapshot.val();
      console.log('Data from Firebase:', data); // Log received data
      setDetectImage(data); // Update detectImage state
      setLoading(false); // Once data is received and set, mark loading as false
    }, (error) => {
      console.error('Error fetching detect_image:', error);
      setLoading(false); // Set loading to false even on error
    });

    return () => {
      unsubscribe(); // Clean up Firebase listener
    };
  }, []);

  // Function to handle navigating to the previous image
  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  // Function to handle navigating to the next image
  const handleNext = () => {
    if (currentIndex < imageUrls.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };  
  // Render loading indicator while waiting for data
  if (loading) {
    return <Text>Loading...</Text>;
  }
  
  return (
    isActive && (
      <View style={styles.container}>
        {imageUrls.length > 0 && (
          <View>
            <Image
              source={{ uri: imageUrls[currentIndex] }}
              style={styles.image}
            />
            <View style={styles.navigation}>
              <TouchableOpacity onPress={handlePrev} disabled={currentIndex === 0}>
                <Text style={[styles.arrow, currentIndex === 0 && styles.disabledArrow]}>←</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleNext} disabled={currentIndex === imageUrls.length - 1}>
                <Text style={[styles.arrow, currentIndex === imageUrls.length - 1 && styles.disabledArrow]}>→</Text>
              </TouchableOpacity>
            </View>
            {detectImage ? (
              <View style={styles.detectImageContainer}>
                <Text style={styles.detectImageText}>Detect Image Details: <Text style={styles.detectImage}>{detectImage}</Text> </Text>
              </View>
            ) : (
              <Text style={styles.detectImage}>Detect image data is not available</Text>
            )}
          </View>
        )}
      </View>
    )
  );
};

const Pagination = ({ itemsPerPage, totalItems, paginate, currentPage }) => {
  const pageNumbers = [];

  for (let i = 1; i <= Math.ceil(totalItems / itemsPerPage); i++) {
    pageNumbers.push(i);
  }

  return (
    <View style={styles.paginationContainer}>
      {pageNumbers.map(number => (
        <TouchableOpacity
          key={number}
          onPress={() => paginate(number)}
          style={[
            styles.paginationButton,
            { backgroundColor: currentPage === number ? '#4CAF50' : 'transparent' },
          ]}
        >
          <Text style={styles.paginationText}>{number}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

const TableContent = ({ isActive }) => {
  const [tableData, setTableData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [searchTime, setSearchTime] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 7;
  const database = getDatabase();
  // Fetch data from Firebase
  useEffect(() => {
      const tableDataRef = ref(database, 'history');
      const unsubscribe = onValue(tableDataRef, (snapshot) => {
          const data = snapshot.val();
          if (data) {
              // Convert data to array and set state
              const dataArray = Object.values(data);
              setTableData(dataArray);
              // Filter data based on searchTime
              setFilteredData(dataArray.filter(item => item.time.includes(searchTime)));
          } else {
              setTableData([]);
              setFilteredData([]);
          }
      });
      return () => {
          off(tableDataRef);
      };
  }, [searchTime]);

  // Handle pagination
  const paginate = (pageNumber) => {
      setCurrentPage(pageNumber);
  };

  // Calculate the data to be displayed based on pagination
  const currentData = filteredData.slice(
      (currentPage - 1) * itemsPerPage,
      currentPage * itemsPerPage
  );

  return (
      isActive && (
          <View>
              <TextInput
                  style={styles.searchInput}
                  placeholder="Enter time..."
                  value={searchTime}
                  onChangeText={setSearchTime}
              />
              <Text style={styles.heading}>HISTORY</Text>
              <FlatList
                  data={currentData}
                  renderItem={({ item }) => (
                      <View style={styles.tableRow}>
                      
                          <Text style={[styles.cell, styles.cellText]}>{item.name}</Text>
                          <Text style={[styles.cell, styles.cellText]}>{item.category}</Text>
                          <Text style={[styles.cell, styles.cellText]}>{item.time}</Text>
                      </View>
                  )}
                  keyExtractor={(item) => item.time}
              />
              <Pagination
                  itemsPerPage={itemsPerPage}
                  totalItems={filteredData.length}
                  paginate={paginate}
                  currentPage={currentPage}
              />
          </View>
      )
  );
};
const TimerContent = ({ isActive }) => {
  const [timer, setTimer] = useState(null);
  const [timersList, setTimersList] = useState([]);
  const [currentId, setCurrentId] = useState(1);
  const [showDateTimePicker, setShowDateTimePicker] = useState(false);

  const database = getDatabase();
  const timersRef = ref(database, 'timersOfDog');

  // Load danh sách hẹn giờ từ Firebase
  useEffect(() => {
    const unsubscribe = onValue(timersRef, (snapshot) => {
      const data = snapshot.val();
      const timersArray = data ? Object.entries(data).map(([key, value]) => ({ ...value, key })) : [];
      setTimersList(timersArray);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Hàm để xử lý khi người dùng chọn thời gian
  const handleDateTimeChange = (event, selectedTime) => {
    setShowDateTimePicker(false);
    // Kiểm tra xem người dùng có chọn thời gian không
    if (event.type === 'set' && selectedTime) {
      setTimer(selectedTime);
    }
  };

  function formatTime(date) {
    const options = { hour: '2-digit', minute: '2-digit', hour12: false };
    return new Intl.DateTimeFormat('en-GB', options).format(date);
  }

  // Hàm để thêm hoặc cập nhật hẹn giờ mới sau khi xác nhận
  const handleAddTimer1 = () => {
    if (!timer) {
      return;
    }
  
    const formattedTime = formatTime(timer);
  
  
    // Check if the time already exists in the list
    const isDuplicate = timersList.some((t) => t.time === formattedTime);
  
    if (isDuplicate) {
      Alert.alert(
        'Duplicate Timer',
        'The selected time already exists. Please choose a different time.',
        [{ text: 'OK' }],
        { cancelable: false }
      );
      return;
    }
  
    // Confirm before adding the new timer
    Alert.alert(
      'Confirm Timer Addition',
      'Are you sure you want to add a new timer?',
      [
        { text: 'Cancel', onPress: () => console.log('Add Timer Cancelled'), style: 'cancel' },
        {
          text: 'OK',
          onPress: () => {
            // Add the new timer
            const newTimer = {
              time: formattedTime,
              id: currentId,
            };
            push(timersRef, newTimer)
              .then(() => {
                setTimer(null);
                setCurrentId((prevId) => prevId + 1);
              })
              .catch((error) => {
                console.error('Error adding timer:', error);
              });
          },
        },
      ],
      { cancelable: false }
    );
  };
  

  // Hàm để xóa hẹn giờ
  const handleDeleteTimer = (key) => {
    Alert.alert(
      'Confirm Delete',
      'Are you sure you want to delete this timer?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'OK',
          onPress: () => {
            const timerRefToRemove = child(timersRef, key);
            remove(timerRefToRemove)
              .then(() => console.log('Timer removed from Firebase'))
              .catch((error) => console.error('Error removing timer:', error));
          },
        },
      ],
      { cancelable: false }
    );
  };

  return (
    isActive && (
      <View>
        <Text style={styles.heading}>Timer</Text>

        {/* View chứa Text, có thể ẩn khi DateTimePicker được hiển thị */}
        <View style={showDateTimePicker ? styles.hidden : styles.timerInput}>
          <TouchableOpacity onPress={() => setShowDateTimePicker(true)}>
            <Text>{timer ? formatTime(timer) : 'Select Time'}</Text>
          </TouchableOpacity>
        </View>

        {/* Hiển thị DateTimePicker khi được kích hoạt */}
        {showDateTimePicker && (
          <View style={styles.centeredPicker}>
            <DateTimePicker
              value={timer || new Date()}
              mode="time"
              is24Hour={true}
              display="default"
              onChange={handleDateTimeChange}
            />
          </View>
        )}

        {/* Nút để thêm hẹn giờ */}
        <TouchableOpacity style={styles.addButton} onPress={handleAddTimer1}>
          <Text style={styles.addButtonText}>Add Timer</Text>
        </TouchableOpacity>

        {/* Hiển thị danh sách các hẹn giờ đã đặt */}
        <FlatList
          data={timersList}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <View style={styles.timerItem}>
              <Text style={styles.timerText}>Time: {item.time}</Text>
              <TouchableOpacity onPress={() => handleDeleteTimer(item.key)}>
                <Text style={styles.deleteButtonText}>Delete</Text>
              </TouchableOpacity>
            </View>
          )}
        />
      </View>
    )
  );
};

const NewTabContent = ({ isActive }) => {
  const [timer, setTimer] = useState(null);
  const [timersList, setTimersList] = useState([]);
  const [currentId, setCurrentId] = useState(1);
  const [showDateTimePicker, setShowDateTimePicker] = useState(false);

  const database = getDatabase();
  const timersRef = ref(database, 'timersOfCat');

  // Load danh sách hẹn giờ từ Firebase
  useEffect(() => {
    const unsubscribe = onValue(timersRef, (snapshot) => {
      const data = snapshot.val();
      const timersArray = data ? Object.entries(data).map(([key, value]) => ({ ...value, key })) : [];
      setTimersList(timersArray);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Hàm để xử lý khi người dùng chọn thời gian
  const handleDateTimeChange = (event, selectedTime) => {
    setShowDateTimePicker(false);
    // Kiểm tra xem người dùng có chọn thời gian không
    if (event.type === 'set' && selectedTime) {
      setTimer(selectedTime);
    }
  };

  function formatTime(date) {
    const options = { hour: '2-digit', minute: '2-digit', hour12: false };
    return new Intl.DateTimeFormat('en-GB', options).format(date);
  }

  // Hàm để thêm hoặc cập nhật hẹn giờ mới sau khi xác nhận
  const handleAddTimer1 = () => {
    if (!timer) {
      return;
    }
  
    const formattedTime = formatTime(timer);
  
    // Check if the time already exists in the list
    const isDuplicate = timersList.some((t) => t.time === formattedTime);
  
    if (isDuplicate) {
      Alert.alert(
        'Duplicate Timer',
        'The selected time already exists. Please choose a different time.',
        [{ text: 'OK' }],
        { cancelable: false }
      );
      return;
    }
  
    // Confirm before adding the new timer
    Alert.alert(
      'Confirm Timer Addition',
      'Are you sure you want to add a new timer?',
      [
        { text: 'Cancel', onPress: () => console.log('Add Timer Cancelled'), style: 'cancel' },
        {
          text: 'OK',
          onPress: () => {
            // Add the new timer
            const newTimer = {
              time: formattedTime,
              id: currentId,
            };
            push(timersRef, newTimer)
              .then(() => {
                setTimer(null);
                setCurrentId((prevId) => prevId + 1);
              })
              .catch((error) => {
                console.error('Error adding timer:', error);
              });
          },
        },
      ],
      { cancelable: false }
    );
  };
  

  // Hàm để xóa hẹn giờ
  const handleDeleteTimer = (key) => {
    Alert.alert(
      'Confirm Delete',
      'Are you sure you want to delete this timer?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'OK',
          onPress: () => {
            const timerRefToRemove = child(timersRef, key);
            remove(timerRefToRemove)
              .then(() => console.log('Timer removed from Firebase'))
              .catch((error) => console.error('Error removing timer:', error));
          },
        },
      ],
      { cancelable: false }
    );
  };

  return (
    isActive && (
      <View>
        <Text style={styles.heading}>Timer</Text>

        {/* View chứa Text, có thể ẩn khi DateTimePicker được hiển thị */}
        <View style={showDateTimePicker ? styles.hidden : styles.timerInput}>
          <TouchableOpacity onPress={() => setShowDateTimePicker(true)}>
            <Text>{timer ? formatTime(timer) : 'Select Time'}</Text>
          </TouchableOpacity>
        </View>

        {/* Hiển thị DateTimePicker khi được kích hoạt */}
        {showDateTimePicker && (
          <View style={styles.centeredPicker}>
            <DateTimePicker
              value={timer || new Date()}
              mode="time"
              is24Hour={true}
              display="default"
              onChange={handleDateTimeChange}
            />
          </View>
        )}

        {/* Nút để thêm hẹn giờ */}
        <TouchableOpacity style={styles.addButton} onPress={handleAddTimer1}>
          <Text style={styles.addButtonText}>Add Timer</Text>
        </TouchableOpacity>

        {/* Hiển thị danh sách các hẹn giờ đã đặt */}
        <FlatList
          data={timersList}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <View style={styles.timerItem}>
              <Text style={styles.timerText}>Time: {item.time}</Text>
              <TouchableOpacity onPress={() => handleDeleteTimer(item.key)}>
                <Text style={styles.deleteButtonText}>Delete</Text>
              </TouchableOpacity>
            </View>
          )}
        />
      </View>
    )
  );
};

const Tabs = () => {
  const [activeTab, setActiveTab] = useState(1);

  const handleTabClick = (tabIndex) => {
    setActiveTab(tabIndex);
  };

  return (
    <View style={styles.container}>
      <View style={styles.tabContainer}>
      <Tab label="Tab 2" isActive={activeTab === 2} onClick={() => handleTabClick(2)} />
        <Tab
          label="Tab 1"
          isActive={activeTab === 1}
          onClick={() => handleTabClick(1)}
        />
        
        <Tab
          label="Tab 3"
          isActive={activeTab === 3}
          onClick={() => handleTabClick(3)}
        />
         <Tab label="Tab 4" isActive={activeTab === 4} onClick={() => handleTabClick(4)} />
         <Tab label="Tab 5" isActive={activeTab === 5} onClick={() => handleTabClick(5)} />
      </View>
      <View style={styles.contentContainer}>
        <Content isActive={activeTab === 1} showToggleButton={true} />
        <AutoContent isActive={activeTab === 2} />
        <TableContent isActive={activeTab === 3} />
        <TimerContent isActive={activeTab === 4} />
        <NewTabContent isActive={activeTab === 5} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabContainer: {
    marginTop: 50,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  tab: {
    padding: 15,
    borderWidth: 1,
    borderRadius: 5,
  },
  tabText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 20,
  },
  tableContainer: {
    flex: 1,
    width: '110%',
    justifyContent: 'center',
    alignItems: 'center',
     paddingHorizontal: 10,
  },
  tableRow: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    width: '100%',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
    marginVertical: 5,
  },
  cell: {
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 5,
  },
  cellText: {
    fontSize: 17,
    fontWeight: 'bold',
  },
  heading: {
    fontSize: 30,
    fontWeight: 'bold',
    marginBottom: 10,
    alignSelf: 'center',
    color: '#333',
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 10,
    marginBottom: 50,
  },
  paginationButton: {
    padding: 10,
    marginHorizontal: 5,
    borderWidth: 1,
    borderRadius: 5,
    backgroundColor: 'transparent',
  },
  paginationText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  toggleButton: {
    paddingVertical: 15,
    paddingHorizontal: 30,
    backgroundColor: '#4CAF50',
    borderRadius: 30,
    marginTop: 10,
    elevation: 2,
    shadowColor: 'black',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  toggleButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 18,
  },
  catAndDogButton: {
    paddingVertical: 15,
    paddingHorizontal: 30,
    backgroundColor: '#4CAF50',
    borderRadius: 30,
    marginTop: 10,
    elevation: 2,
    shadowColor: 'black',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  catAndDogButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 18,
  },
  buttonDisabled: {
    backgroundColor: '#aaa', // Màu nền nút khi bị vô hiệu hóa
  },
  searchInput: {
    height: 40,
    borderColor: 'black',
    borderWidth: 3,
    borderRadius: 5,
    paddingHorizontal: 10,
    marginBottom: 10,
  },  timerInput: {
    height: 40,
    borderColor: 'black',
    borderWidth: 1,
    borderRadius: 5,
    paddingHorizontal: 10,
    marginBottom: 10,
    justifyContent: 'center',
    alignItems: 'center',
},
hidden: {
    display: 'none', // Ẩn View khi DateTimePicker được kích hoạt
},
centeredPicker: {
  alignItems: 'center',
},
addButton: {
    paddingVertical: 15,
    paddingHorizontal: 30,
    backgroundColor: '#4CAF50',
    borderRadius: 30,
    marginTop: 10,
    elevation: 2,
    shadowColor: 'black',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
},
addButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 18,
},
timerItem: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    width: '100%',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
    marginVertical: 5,
},
timerText: {
    fontSize: 16,
    fontWeight: 'bold',
},
buttonDisabled: {
  backgroundColor: '#b0c4de',
},
notificationText: {
  color: 'red', // Màu đỏ
  fontSize: 18,
  fontWeight: 'bold',
  textAlign: 'center',
  marginTop: 10, // Có thể điều chỉnh khoảng cách giữa các phần tử nếu cần
  borderWidth: 2, // Độ dày của đường viền của text
    borderColor: 'red', // Màu sắc của đường viền của text
    padding: 5, // Khoảng cách giữa nội dung của text và đường viền
    backgroundColor:'lightpink'
},
notificationContainer: {
  marginTop: -250, // Khoảng cách giữa thông báo và các toggle
  marginBottom: 150,
},
image: {
  width: 300,
  height: 300,
  marginBottom: 20,
},
navigation: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignSelf: 'center',
  width: '60%',
},
arrow: {
  fontSize: 30,
  color: 'blue',
},
disabledArrow: {
  color: 'gray',
},
detectImageContainer: {
  marginTop: 20,
  alignItems: 'center',
},
detectImageText: {
  fontSize: 18,
  fontWeight: 'bold',
  marginBottom: 5,
  fontFamily: 'YourFontFamily', // Your desired font family
},
detectImage: {
  fontSize: 18,
  fontWeight: 'bold',
  color:'blue',
  fontFamily: 'YourFontFamily', // Your desired font family
},
});

export default Tabs;