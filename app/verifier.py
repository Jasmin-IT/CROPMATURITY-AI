import torch
from transformers import CLIPModel, CLIPProcessor
from . import config as C


def _tensor(x):
    return x if torch.is_tensor(x) else x.pooler_output


class TomatoVerifier:
    def __init__(self):
        self.model = CLIPModel.from_pretrained(C.CLIP_MODEL).eval()
        self.proc = CLIPProcessor.from_pretrained(C.CLIP_MODEL)
        prompts = list(C.TOMATO_PROMPTS) + [f"a photo of {x}" for x in C.NOT_TOMATO]
        self.n_pos = len(C.TOMATO_PROMPTS)
        inputs = self.proc(text=prompts, return_tensors="pt", padding=True)
        with torch.no_grad():
            t = _tensor(self.model.get_text_features(**inputs))
        self.text = t / t.norm(dim=-1, keepdim=True)

    @torch.no_grad()
    def tomato_prob(self, crops, batch=16):
        """crops: list of PIL images -> probability that each one is a tomato."""
        out = []
        for i in range(0, len(crops), batch):
            inputs = self.proc(images=crops[i:i + batch], return_tensors="pt")
            f = _tensor(self.model.get_image_features(**inputs))
            f = f / f.norm(dim=-1, keepdim=True)
            p = (100.0 * f @ self.text.T).softmax(-1)[:, :self.n_pos].sum(-1)
            out += p.tolist()
        return out