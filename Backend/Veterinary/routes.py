from flask import Blueprint
from utlis.response import createResult
from utlis.db_utlis import executeQuery

vet_bp = Blueprint('vet', __name__)