import torch, os
ck = r"d:\Apurva\Polutry-Guard-AI-Web-Application\poultry_model_training\models\best_resnet18_poultry.pth"
if os.path.exists(ck):
    d = torch.load(ck, map_location='cpu')
    print('checkpoint_epoch:', d.get('epoch'))
    print('best_macro_f1:', d.get('best_macro_f1'))
else:
    print('checkpoint missing')
