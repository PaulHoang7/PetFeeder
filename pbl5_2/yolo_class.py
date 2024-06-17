from ultralytics import YOLO

def getOutput(net):
    layer_names = net.getLayerNames()
    outputLayer = [layer_names[i-1] for i in net.getUnconnectedOutLayers()]
    return outputLayer

class LYL:
    img = None
    detect = "No detections"
    def init(self, im):
        self.img = im
        model = YOLO("yolov8.pt")
        results = model.predict(source = im)
        for box in results[0].boxes:
            if self.detect == "No detections":
                self.detect == ""
            label = box.cls[0].item()
            conf_score = box.conf.item()
            if label == 0 and conf_score >= 0.7:
                self.detect = "cat"
            elif label == 1 and conf_score >= 0.7:
                self.detect = "dog"
            else:
                if self.detect == "":
                    detect = "No detections"
    def getObject(self):
        return self.detect