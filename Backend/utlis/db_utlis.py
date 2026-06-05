import mysql.connector
from utlis.response import createResult

def getConnection():
    return mysql.connector.connect(
        host = "localhost",
        port = 3306,
        user ="root",
        password ="Apurva@3522",
        database="poultryguard_ai",
        use_pure = True
    )

def executeQuery(query, params):
    with getConnection() as con: # with statement will automatically close the connection
        with con.cursor(dictionary =True) as cur:
            cur.execute(query,params)
            if cur.description: # to identify select query because only select query has coloumns 
                return cur.fetchall()
            else:
                con.commit()
                return {"affectedRows": cur.rowcount}

    

