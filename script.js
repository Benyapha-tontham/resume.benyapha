const flip = document.getElementById('flip');
const toggle = () => flip.classList.toggle('on');
flip.addEventListener('click', toggle);
flip.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); } });

document.getElementById('photo').addEventListener('change', e => {
  const file = e.target.files[0];
  if (!file) return;
  const url = URL.createObjectURL(file);
  document.getElementById('photoFace').style.backgroundImage = `url(${url})`;
  flip.classList.add('on');
});

document.getElementById('addWork').addEventListener('click', () => {
  const title = prompt('ชื่อผลงาน');
  if (!title) return;
  const desc = prompt('รายละเอียดสั้นๆ') || '';
  const list = document.getElementById('workList');
  const el = document.createElement('article');
  el.className = 'work';
  el.innerHTML = '<span class="ghost"></span><small class="blue">Project</small><h3></h3><p></p>';
  el.querySelector('.ghost').textContent = String(list.children.length + 1).padStart(2, '0');
  el.querySelector('h3').textContent = title;
  el.querySelector('p').textContent = desc;
  list.appendChild(el);
});
