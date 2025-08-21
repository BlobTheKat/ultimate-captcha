// Example program
#include <iostream>
#include <string>
#include <atomic>
#include <thread>
#include <chrono>
#include <iomanip>
using namespace std;
typedef uint32_t uint;

#define SIZE_MB 128

uint heap[(1<<18) * SIZE_MB];

#define fetch(i) heap[(i)&0x3ffff|r%SIZE_MB<<18]

uint kernel(uint y){
	uint x = 0;
	for(uint r=0;r<262144;r++){
		uint id = x;
		uint a = fetch(y), m = a>>3;
		switch(a&7u){
			case 0u: id ^= fetch(fetch(fetch(fetch(id+m%123u)))); break;
			case 1u: id ^= fetch(fetch(id+m/456u)); break;
			case 2u: id ^= fetch(id+m%997u); break;
			case 3u: id ^= fetch(id+m/451u); break;
			case 4u: id ^= fetch(fetch(fetch(fetch(id+m%409u)))); break;
			case 5u: id ^= fetch(id+m/111u); break;
			case 6u: id ^= fetch(id+m%789u); break;
			case 7u: id ^= fetch(id+m/333u); break;
			case 8u: id += fetch(fetch(fetch(id+m%125u))); break;
			case 9u: id += fetch(id+m/458u); break;
			case 10u: id += fetch(fetch(id+m%999u)); break;
			case 11u: id += fetch(id+m/453u); break;
			case 12u: id += fetch(fetch(id+m%411u)); break;
			case 13u: id += fetch(id+m/113u); break;
			case 14u: id += fetch(fetch(fetch(id+m%791u))); break;
			case 15u: id += fetch(id+m/335u); break;
		}
		y = x; x = id;
	}
	return x;
}
atomic_uint at; int top;
atomic<uint64_t> totalTime;
atomic_uint total;
void work(){
	uint id, hash = 0;
	auto t0 = chrono::high_resolution_clock::now();
	while((id = at++) < top) hash += kernel(id);
	totalTime += (chrono::high_resolution_clock::now() - t0).count();
	total += hash;
}

int main(){
	uint xsh = 9999;
	if(!xsh) xsh = 0xFFFFFFFF;
	for(int i=0;i<(1<<18)*SIZE_MB;i++){
		heap[i] = xsh;
		xsh ^= xsh << 13;
		xsh ^= xsh >> 17;
		xsh ^= xsh << 5;
	}
	top = 512; at = 0;
	long long thc = thread::hardware_concurrency();
	thread* ths = new thread[thc];
	auto t0 = chrono::high_resolution_clock::now();
	for(int i=0;i<thc;i++) ths[i] = thread(work);
	for(int i=0;i<thc;i++) ths[i].join();
	double real = (chrono::high_resolution_clock::now() - t0).count();
	cout << "CPU: " << double(totalTime)/1'000'000 << "ms / threads: " << thc << "\nReal: " << real/1'000'000 << "ms" << endl;
	cout << "hash: " << setfill('0') << setw(8) << hex << total << endl;
}