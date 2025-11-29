'''
Author: Tong Yu
Copyright (c) University of Strasbourg. All Rights Reserved.
'''

import os
import tensorflow as tf
try:
  import tensorflow_addons as tfa
except ImportError:
  tfa = None
import numpy as np
import matplotlib.pyplot as plt
import cv2
from utils import global_helpers as gh
from models.model_17 import Model as ConvNet
from models.model_18 import Model as TmpNet


N_H = 256
N_W = 256
FPS = 25

tf.compat.v1.disable_eager_execution()


def phase_recognition(source):
  framestack = extract_frames(source) if isinstance(source, (str, os.PathLike)) else preprocess(source)
  features = cnn_forward_pass(framestack)
  predictions = temporal_forward_pass(features)
  return predictions


def phase_recognition_ds(frames):
  pp_frames = preprocess_ds(frames)
  features = cnn_forward_pass_ds(pp_frames)
  predictions = temporal_forward_pass(features)
  return predictions


def phase_plot(phases):
  fig = plt.figure(figsize=(10, 2))
  ax = fig.add_subplot(111)
  ax.set_yticks([], [])
  ax.pcolormesh(phases, cmap="Set2")


def extract_frames(vidpath):
  res = extract_raw_frames(str(vidpath))
  res = preprocess(res)
  return res


def extract_raw_frames(vidpath):
  res = []
  count = 0
  vidcap = cv2.VideoCapture(vidpath)
  flag = True
  while flag:
    flag, frame = vidcap.read()
    if frame is not None:
      if count % FPS == 0:
        res.append(frame)
    else:
      break
    count += 1
  vidcap.release()
  return res


def preprocess(frames):
  frames = _ensure_frame_list(frames)
  h_in = frames[0].shape[0]
  w_in = frames[0].shape[1]
  center = w_in / 2
  radius = h_in / 2
  w_left = int(center - radius)
  w_right = int(center + radius)
  frames = [
    cv2.resize(f[:, w_left:w_right, ::-1], (N_H, N_W)) / 255.0
    for f in frames
  ]
  return frames


def _ensure_frame_list(frames):
  if isinstance(frames, np.ndarray):
    if frames.ndim == 3:
      frames_list = [frames]
    elif frames.ndim == 4:
      frames_list = [frame for frame in frames]
    else:
      raise ValueError("Numpy frame input must have rank 3 or 4.")
  elif isinstance(frames, (list, tuple)):
    frames_list = list(frames)
  else:
    raise TypeError("Frames must be a path, numpy array, or list/tuple of arrays.")
  if not frames_list:
    raise ValueError("No frames provided for preprocessing.")
  for idx, frame in enumerate(frames_list):
    if not isinstance(frame, np.ndarray):
      raise TypeError("Frame at index {} is not a numpy array.".format(idx))
    if frame.ndim != 3:
      raise ValueError("Frame at index {} must have rank 3.".format(idx))
  return frames_list


def cnn_forward_pass(frames):
  tf.compat.v1.reset_default_graph()
  features = []
  hp = gh.parse_hp("hparams/hp_225.yaml")
  m = ConvNet(hp)
  inp = tf.compat.v1.placeholder(dtype=tf.float32, shape=[None, N_H, N_W, 3])
  _ = m.forward_pass(inp)
  with tf.compat.v1.Session() as sess:
    sess.run(tf.compat.v1.global_variables_initializer())
    m.load_pretrained_resnet(sess, "checkpoints/cnn/cnn.ckpt")
    fetches = {
      "features": m.fetches["cnn_output"]
    }
    for f in frames:
      ret = sess.run(
        fetches,
        feed_dict={
          m.fetches["train_flag"]: False,
          inp: np.expand_dims(f, axis=0)
        }
      )
      features.append(ret["features"])
  return features


def preprocess_ds(frames):
  h_in = frames.shape[1]
  w_in = frames.shape[2]
  center = w_in // 2
  radius = h_in // 2
  w_left = center - radius
  w_right = center + radius
  frames = tf.image.convert_image_dtype(frames, tf.float32)
  frames = tf.image.resize(
    frames[:, :, w_left:w_right, :],
    [N_H, N_W]
  ) 
  return frames

def cnn_forward_pass_ds(frames):
  features = []
  hp = gh.parse_hp("hparams/hp_225.yaml")
  m = ConvNet(hp)
  _ = m.forward_pass(frames)
  with tf.compat.v1.Session() as sess:
    sess.run(tf.compat.v1.global_variables_initializer())
    m.load_pretrained_resnet(sess, "checkpoints/cnn/cnn.ckpt")
    fetches = {
      "features": m.fetches["cnn_output"]
    }
    while True:
      try:
        ret = sess.run(
          fetches,
          feed_dict={m.fetches["train_flag"]: False}
        )
        features.append(ret["features"])
      except tf.errors.OutOfRangeError:
        break
  return features


def temporal_forward_pass(features):
  if tfa is None:
    raise ImportError(
      "tensorflow_addons is required for CRF decoding. Please install it via "
      "`pip install tensorflow-addons`."
    )
  tf.compat.v1.reset_default_graph()
  hp = gh.parse_hp("hparams/hp_302.yaml")
  m = TmpNet(hp)
  features_in = np.concatenate(features)
  n_t = features_in.shape[0]
  out = m.forward_pass(features_in)
  out = tf.expand_dims(out, 0)
  labels = tf.zeros(shape=[1, n_t], dtype=tf.int32)
  transition_params = tf.compat.v1.get_variable(
    "transitions",
    shape=[hp.n_classes, hp.n_classes],
    dtype=tf.float32
  )
  _, transition_matrix = tfa.text.crf_log_likelihood(
    out,
    labels,
    tf.constant([n_t]),
    transition_params=transition_params
  )
  predictions, viterbi_score = tfa.text.crf_decode(
    out,
    transition_matrix,
    tf.constant([n_t])
  )
  saver = tf.compat.v1.train.Saver()
  with tf.compat.v1.Session() as sess:
    sess.run(tf.compat.v1.global_variables_initializer())
    saver.restore(sess, "checkpoints/temporal/temporal.ckpt")
    fetches = {
      "predictions": predictions
    }
    ret = sess.run(
      fetches,
      feed_dict={m.fetches["train_flag"]: False}
    )
  return ret["predictions"]
