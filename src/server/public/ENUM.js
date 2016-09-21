var ENUM = {}

ENUM.THREAD_STATUS = {
    WAIT: {code: 0, name: "等待", label: "default"},
    RECORDING: {code: 1, name: "正在录制", label: "info"},
    END_RECORDING: {code: -8, name: " 结束录制中", label: "danger"},
    END: {code: -9, name: " 结束", label: "success"},
}

ENUM.STREAM_STATUS = {
    WAIT: {code: 0, name: "等待", label: "default"},
    RECORDING: {code: 1, name: "正在录制", label: "info"},
    END_RECORDING: {code: -8, name: " 结束录制中", label: "danger"},
    END: {code: -9, name: " 结束", label: "success"},
}

module.exports = ENUM;