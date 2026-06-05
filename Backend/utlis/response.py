
from flask import jsonify


def createResult(error,data):
    if error is not None:
        return jsonify(status="error",error = error)
   
    return jsonify(status="success",data = data)
    