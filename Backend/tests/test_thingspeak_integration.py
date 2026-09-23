import os
import sys

# Re-export and execute the root test suite
TESTS_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(os.path.dirname(TESTS_DIR))
sys.path.insert(0, PROJECT_ROOT)

from tests.test_thingspeak_integration import *

if __name__ == "__main__":
    import unittest
    unittest.main()
