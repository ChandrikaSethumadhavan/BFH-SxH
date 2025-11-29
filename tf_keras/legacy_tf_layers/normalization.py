"""
Compatibility wrappers for normalization layers expected by tf_slim.
"""

from tensorflow.compat.v1.layers import BatchNormalization as _BatchNormalization
from tensorflow.compat.v1.layers import batch_normalization as _batch_normalization


BatchNormalization = _BatchNormalization
BatchNorm = BatchNormalization
batch_normalization = _batch_normalization
batch_norm = batch_normalization
