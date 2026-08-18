import time
import os
import subprocess
import json
import torch

CK = os.path.join(os.path.dirname(__file__), '..', 'poultry_model_training', 'models', 'best_resnet18_poultry.pth')

def read_checkpoint(ck):
    if not os.path.exists(ck):
        return None
    try:
        d = torch.load(ck, map_location='cpu')
        return {'epoch': d.get('epoch'), 'best_macro_f1': d.get('best_macro_f1')}
    except Exception as e:
        return {'error': str(e)}


def gpu_status():
    try:
        out = subprocess.check_output(['nvidia-smi', '--query-gpu=name,utilization.gpu,memory.used,memory.total', '--format=csv,noheader,nounits'], stderr=subprocess.DEVNULL)
        return out.decode('utf-8').strip()
    except Exception as e:
        return f'nvidia-smi error: {e}'


if __name__ == '__main__':
    print('Starting training monitor (prints status every 60s).')
    try:
        while True:
            ts = time.strftime('%Y-%m-%d %H:%M:%S')
            print('\n=== STATUS @', ts, '===')
            ck = read_checkpoint(CK)
            if ck is None:
                print('Checkpoint: not found')
            else:
                print('Checkpoint:', ck)
                try:
                    mtime = os.path.getmtime(CK)
                    print('Checkpoint last write:', time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(mtime)))
                except Exception:
                    pass
            print('\nGPU:')
            print(gpu_status())
            print('\n')
            time.sleep(60)
    except KeyboardInterrupt:
        print('Monitor stopped by user')
